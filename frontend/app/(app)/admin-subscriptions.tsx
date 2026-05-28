import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";
import { SubscriptionAccount, SubscriptionStatus, UserRole } from "@/types/auth";

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

const statusActions: Array<{ label: string; value: SubscriptionStatus; tone?: "primary" | "soft" | "danger" }> = [
  { label: "Teste", value: "TRIAL" },
  { label: "Ativo", value: "ACTIVE" },
  { label: "Pendente", value: "PAST_DUE", tone: "soft" },
  { label: "Cancelar", value: "CANCELED", tone: "danger" }
];

const providerOptions = ["NONE", "STRIPE", "MERCADO_PAGO"] as const;
type BillingProviderOption = (typeof providerOptions)[number];

function subscriptionsPath(search: string, role?: UserRole): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (role) params.set("role", role);
  const query = params.toString();
  return `/admin/subscriptions${query ? `?${query}` : ""}`;
}

function displayValue(value?: string | null): string {
  return value?.trim() ? value : "Nao vinculado";
}

function BillingReferenceForm({ account }: { account: SubscriptionAccount }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<BillingProviderOption>(
    (account.billing_provider as BillingProviderOption | null) ?? "NONE"
  );
  const [customerId, setCustomerId] = useState(account.billing_customer_id ?? "");
  const [subscriptionId, setSubscriptionId] = useState(account.billing_subscription_id ?? "");
  const [lastEventId, setLastEventId] = useState(account.billing_last_event_id ?? "");
  const updateReference = useMutation({
    mutationFn: () =>
      apiRequest("/admin/billing-reference", {
        method: "POST",
        body: JSON.stringify({
          user_id: account.id,
          billing_provider: provider,
          billing_customer_id: customerId.trim() || null,
          billing_subscription_id: subscriptionId.trim() || null,
          billing_last_event_id: lastEventId.trim() || null,
          reason: "billing provider reference update"
        })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] })
  });

  return (
    <View className="gap-3 rounded-2xl border border-white/10 bg-ink/35 p-3">
      <Text className="text-sm font-semibold text-white">Referencia externa futura</Text>
      <Text className="text-xs leading-5 text-muted">
        Apenas vincula IDs de Stripe ou Mercado Pago. Esta tela nao cria checkout e nao confirma pagamento.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {providerOptions.map((option) => {
          const selected = provider === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className={`rounded-full border px-3 py-2 ${
                selected ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
              }`}
              onPress={() => setProvider(option)}
            >
              <Text className={`text-xs font-semibold ${selected ? "text-ink" : "text-white"}`}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <Field label="Customer ID externo" value={customerId} onChangeText={setCustomerId} maxLength={120} />
      <Field label="Subscription ID externo" value={subscriptionId} onChangeText={setSubscriptionId} maxLength={120} />
      <Field label="Ultimo evento webhook" value={lastEventId} onChangeText={setLastEventId} maxLength={160} />
      <ErrorText message={updateReference.error?.message} />
      <Button
        label="Salvar referencia"
        tone="soft"
        loading={updateReference.isPending}
        onPress={() => updateReference.mutate()}
      />
    </View>
  );
}

export default function AdminSubscriptions() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | undefined>();
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const subscriptions = useQuery({
    queryKey: ["admin-subscriptions", search.trim(), role],
    queryFn: () => apiRequest<SubscriptionAccount[]>(subscriptionsPath(search, role)),
    enabled: user?.role === "SUPER_ADMIN"
  });

  const updateStatus = useMutation({
    mutationFn: ({ userId, subscriptionStatus }: { userId: string; subscriptionStatus: SubscriptionStatus }) =>
      apiRequest("/admin/subscription-status", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          subscription_status: subscriptionStatus,
          reason: reason.trim() || null
        })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] })
  });

  const accounts = subscriptions.data ?? [];

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">ADMIN</Text>
        <Text className="text-3xl font-semibold text-white">Assinaturas</Text>
        <Text className="text-base leading-6 text-muted">
          Controle manual de planos pagos ate a integracao com gateway real.
        </Text>
      </View>

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
      <Field label="Motivo da alteracao" value={reason} onChangeText={setReason} />
      <ErrorText message={subscriptions.error?.message ?? updateStatus.error?.message} />
      {subscriptions.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
      {accounts.length === 0 && !subscriptions.isLoading ? (
        <Text className="text-muted">Nenhuma conta paga encontrada.</Text>
      ) : null}

      <View className="gap-3">
        {accounts.map((account: SubscriptionAccount) => (
          <Card key={account.id}>
            <Text className="text-lg font-semibold text-white">{account.full_name}</Text>
            <Text selectable className="text-sm text-muted">{account.email}</Text>
            <Text className="text-sm text-muted">Perfil: {account.role}</Text>
            <Text className="text-sm text-muted">Conta: {account.status}</Text>
            <Text className="text-sm text-muted">Plano: {planLabel(account.subscription_plan)}</Text>
            <Text className="text-sm text-muted">
              Assinatura: {subscriptionStatusLabel(account.subscription_status)}
            </Text>
            <View className="gap-1 rounded-2xl border border-white/10 bg-ink/35 p-3">
              <Text className="text-sm font-semibold text-white">Gateway futuro</Text>
              <Text selectable className="text-xs text-muted">
                Provider: {displayValue(account.billing_provider)}
              </Text>
              <Text selectable className="text-xs text-muted">
                Customer: {displayValue(account.billing_customer_id)}
              </Text>
              <Text selectable className="text-xs text-muted">
                Subscription: {displayValue(account.billing_subscription_id)}
              </Text>
              <Text selectable className="text-xs text-muted">
                Ultimo evento: {displayValue(account.billing_last_event_id)}
              </Text>
            </View>
            <Text className="text-xs leading-5 text-muted">
              Trial e Ativo liberam recursos pagos. Pendente e Cancelado bloqueiam acesso pago sem afetar
              dados do usuario.
            </Text>
            <BillingReferenceForm account={account} />
            <View className="gap-2">
              {statusActions.map((action) => (
                <Button
                  key={action.value}
                  label={action.label}
                  tone={action.tone}
                  disabled={account.subscription_status === action.value || updateStatus.isPending}
                  onPress={() => updateStatus.mutate({ userId: account.id, subscriptionStatus: action.value })}
                />
              ))}
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
