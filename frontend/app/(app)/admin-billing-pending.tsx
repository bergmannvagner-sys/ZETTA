import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import {
  BillingConfig,
  MercadoPagoCheckout,
  PaymentAdapterCapability,
  SubscriptionAccount,
  UserRole
} from "@/types/auth";

const roleFilters: Array<{ label: string; value?: UserRole }> = [
  { label: "Todos" },
  { label: "Psicologos", value: "PSYCHOLOGIST" },
  { label: "Empresas", value: "COMPANY" },
  { label: "Clinicas", value: "CLINIC" },
  { label: "Hospitais", value: "HOSPITAL" },
  { label: "ONGs", value: "NGO" },
  { label: "Patroc.", value: "SPONSOR" },
  { label: "Publicas", value: "PUBLIC_INSTITUTION" }
];

function pendingPath(search: string, role?: UserRole): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (role) params.set("role", role);
  const query = params.toString();
  return `/admin/billing-pending-accounts${query ? `?${query}` : ""}`;
}

function displayValue(value?: string | null): string {
  return value?.trim() ? value : "Sem registro";
}

function displayDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "Sem registro";
}

export default function AdminBillingPending() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | undefined>();
  const queryClient = useQueryClient();
  const pendingAccounts = useQuery({
    queryKey: ["admin-billing-pending", search.trim(), role],
    queryFn: () => apiRequest<SubscriptionAccount[]>(pendingPath(search, role)),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const billingConfig = useQuery({
    queryKey: ["admin-billing-config"],
    queryFn: () => apiRequest<BillingConfig>("/admin/billing-config"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const createCheckout = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      apiRequest<MercadoPagoCheckout>("/admin/mercado-pago/checkout-preference", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          reason: "financial pending checkout resend"
        })
      }),
    onSuccess: async (checkout) => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      await Linking.openURL(checkout.checkout_url);
    }
  });
  const accounts: SubscriptionAccount[] = pendingAccounts.data ?? [];
  const mercadoPagoReady = Boolean(
    billingConfig.data?.provider_capabilities.find(
      (capability: PaymentAdapterCapability) => capability.provider === "MERCADO_PAGO" && capability.checkout_enabled
    )
  );

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">ADMIN</Text>
        <Text className="text-3xl font-semibold text-white">Pendencias financeiras</Text>
        <Text className="text-base leading-6 text-muted">
          Contas comerciais aprovadas sem pagamento confirmado por webhook ativo.
        </Text>
      </View>

      <Card>
        <Text className="text-base font-semibold text-white">{accounts.length} pendencia(s)</Text>
        <Text className="text-sm leading-5 text-muted">
          {mercadoPagoReady
            ? "Mercado Pago esta pronto para criar ou reenviar checkout administrativo."
            : "Checkout bloqueado ate Mercado Pago estar configurado no Render."}
        </Text>
      </Card>

      <Field label="Buscar por nome ou email" value={search} onChangeText={setSearch} />
      <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
        {roleFilters.map((filter) => {
          const selected = role === filter.value;
          return (
            <Pressable
              key={filter.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className={`rounded-full border px-4 py-2 ${
                selected ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
              }`}
              onPress={() => setRole(filter.value)}
            >
              <Text className={`text-sm font-semibold ${selected ? "text-ink" : "text-white"}`}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorText message={pendingAccounts.error?.message ?? billingConfig.error?.message ?? createCheckout.error?.message} />
      {pendingAccounts.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
      {accounts.length === 0 && !pendingAccounts.isLoading ? (
        <Text className="text-muted">Nenhuma pendencia financeira encontrada.</Text>
      ) : null}

      <View className="gap-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <Text className="text-lg font-semibold text-white">{account.full_name}</Text>
              <Text className="rounded-full border border-violet/30 bg-violet/20 px-3 py-1 text-xs font-semibold text-white">
                {subscriptionStatusLabel(account.subscription_status)}
              </Text>
            </View>
            <Text selectable className="text-sm text-muted">{account.email}</Text>
            <Text className="text-sm text-muted">Perfil: {account.role}</Text>
            <Text className="text-sm text-muted">Plano: {planLabel(account.subscription_plan)}</Text>
            <View className="gap-1 rounded-2xl border border-white/10 bg-ink/35 p-3">
              <Text className="text-sm font-semibold text-white">Motivo da pendencia</Text>
              <Text selectable className="text-xs leading-5 text-muted">
                {account.billing_financial_pending_reason ?? "Sem pagamento confirmado por webhook."}
              </Text>
            </View>
            <View className="gap-1 rounded-2xl border border-white/10 bg-ink/35 p-3">
              <Text className="text-sm font-semibold text-white">Ultima cobranca</Text>
              <Text selectable className="text-xs leading-5 text-muted">
                Checkout: {displayValue(account.billing_last_checkout_preference_id)}
              </Text>
              <Text selectable className="text-xs leading-5 text-muted">
                Criado em: {displayDate(account.billing_last_checkout_at)}
              </Text>
              <Text selectable className="text-xs leading-5 text-muted">
                Ultimo webhook: {displayDate(account.billing_last_webhook_at)}
              </Text>
              <Text selectable className="text-xs leading-5 text-muted">
                Status externo: {displayValue(account.billing_last_webhook_status)}
              </Text>
            </View>
            <Button
              label={account.billing_last_checkout_preference_id ? "Reenviar checkout" : "Criar checkout"}
              tone="soft"
              disabled={!mercadoPagoReady || createCheckout.isPending}
              loading={createCheckout.isPending}
              onPress={() => createCheckout.mutate({ userId: account.id })}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
