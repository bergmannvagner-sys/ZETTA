import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import {
  BillingPendingAlert,
  BillingPendingAlertStatus,
  BillingConfig,
  MercadoPagoCheckout,
  PaymentAdapterCapability,
  SubscriptionAccount,
  UserRole
} from "@/types/auth";

const roleFilters: Array<{ label: string; value?: UserRole }> = [
  { label: "Todos" },
  { label: "Psicólogos", value: "PSYCHOLOGIST" },
  { label: "Empresas", value: "COMPANY" },
  { label: "Clínicas", value: "CLINIC" },
  { label: "Hospitais", value: "HOSPITAL" },
  { label: "ONGs", value: "NGO" },
  { label: "Patrocinadores", value: "SPONSOR" },
  { label: "Públicas", value: "PUBLIC_INSTITUTION" }
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

function emailStatus(value?: boolean | null): string {
  if (value === true) return "enviado";
  if (value === false) return "não enviado";
  return "sem registro";
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
  const alertStatus = useQuery({
    queryKey: ["admin-billing-pending-alert-status"],
    queryFn: () => apiRequest<BillingPendingAlertStatus>("/admin/billing-pending-alert-status"),
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
      queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
      await Linking.openURL(checkout.checkout_url);
    }
  });
  const sendPendingAlert = useMutation({
    mutationFn: () =>
      apiRequest<BillingPendingAlert>("/admin/billing-pending-alerts?days=7", {
        method: "POST"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-pending-alert-status"] });
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
    }
  });
  const accounts: SubscriptionAccount[] = pendingAccounts.data ?? [];
  const status = alertStatus.data;
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
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Pendências financeiras"
          subtitle="Contas comerciais aprovadas sem pagamento confirmado por webhook ativo."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 960, gap: 16 }}>
          <Card>
            <Text className="text-base font-semibold text-ink dark:text-white">{accounts.length} pendência(s)</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
              {mercadoPagoReady
                ? "Mercado Pago está pronto para criar ou reenviar checkout administrativo."
                : "Checkout bloqueado até o Mercado Pago estar configurado no Render."}
            </Text>
            <View className="gap-2">
              <Button
                label="Enviar alerta de pendências antigas"
                tone="soft"
                disabled={sendPendingAlert.isPending}
                loading={sendPendingAlert.isPending}
                onPress={() => sendPendingAlert.mutate()}
              />
              {sendPendingAlert.data ? (
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  Alerta: {sendPendingAlert.data.alerted_accounts} conta(s) com mais de{" "}
                  {sendPendingAlert.data.days_threshold} dia(s). E-mail{" "}
                  {sendPendingAlert.data.email_sent ? "enviado" : "não enviado"}.
                </Text>
              ) : null}
            </View>
          </Card>

          {status ? (
            <Card>
              <Text className="text-base font-semibold text-ink dark:text-white">Automação de alerta</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Rotina {status.auto_enabled ? "ativa" : "inativa"}: {status.days_threshold} dia(s), intervalo de{" "}
                {status.interval_hours}h, limite {status.limit}.
              </Text>
                <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  Última execução: {displayDate(status.last_scheduled_alert_at)}. E-mail:{" "}
                  {emailStatus(status.last_scheduled_email_sent)}.
                </Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Resultado: {status.last_scheduled_alerted_accounts ?? 0} alertada(s),{" "}
                {status.last_scheduled_pending_accounts ?? 0} pendente(s),{" "}
                {status.last_scheduled_checked_accounts ?? 0} verificada(s).
              </Text>
              <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                Próximo disparo permitido: {displayDate(status.next_allowed_alert_at)}.
              </Text>
            </Card>
          ) : null}

          <Field label="Buscar por nome ou e-mail" value={search} onChangeText={setSearch} />

          <View className="flex-row flex-wrap gap-2" accessibilityRole="tablist">
            {roleFilters.map((filter) => {
              const selected = role === filter.value;
              return (
                <Pressable
                  key={filter.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  className={`rounded-full border px-4 py-2 ${
                    selected
                      ? "border-primary bg-primaryLight"
                      : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"
                  }`}
                  onPress={() => setRole(filter.value)}
                >
                  <Text className="text-sm font-semibold text-ink dark:text-white">{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <ErrorText
            message={
              pendingAccounts.error?.message ??
              billingConfig.error?.message ??
              alertStatus.error?.message ??
              createCheckout.error?.message ??
              sendPendingAlert.error?.message
            }
          />
          {pendingAccounts.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}
          {accounts.length === 0 && !pendingAccounts.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">Nenhuma pendência financeira encontrada.</Text>
          ) : null}

          <View className="gap-3">
            {accounts.map((account) => (
              <Card key={account.id}>
                <View className="flex-row flex-wrap items-center justify-between gap-2">
                  <Text className="text-lg font-semibold text-ink dark:text-white">{account.full_name}</Text>
                  <Text className="rounded-full border border-primaryDark/30 bg-primaryDark/20 px-3 py-1 text-xs font-semibold text-ink dark:text-white">
                    {subscriptionStatusLabel(account.subscription_status)}
                  </Text>
                </View>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  {account.email}
                </Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Perfil: {account.role}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Plano: {planLabel(account.subscription_plan)}</Text>
                <View className="gap-1 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
                  <Text className="text-sm font-semibold text-ink dark:text-white">Motivo da pendência</Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    {account.billing_financial_pending_reason ?? "Sem pagamento confirmado por webhook."}
                  </Text>
                </View>
                <View className="gap-1 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
                  <Text className="text-sm font-semibold text-ink dark:text-white">Última cobrança</Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    Checkout: {displayValue(account.billing_last_checkout_preference_id)}
                  </Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    Criado em: {displayDate(account.billing_last_checkout_at)}
                  </Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    Último webhook: {displayDate(account.billing_last_webhook_at)}
                  </Text>
                  <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
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
        </View>
      </View>
    </Screen>
  );
}
