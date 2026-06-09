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
  AuditLogEntry,
  BillingConfig,
  MercadoPagoCheckout,
  PaymentAdapterCapability,
  SubscriptionAccount,
  SubscriptionStatus,
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

const statusActions: Array<{ label: string; value: SubscriptionStatus; tone?: "primary" | "soft" | "danger" }> = [
  { label: "Ativo", value: "ACTIVE" },
  { label: "Vencido", value: "PAST_DUE", tone: "soft" },
  { label: "Cancelar", value: "CANCELED", tone: "danger" }
];

const providerOptions = ["NONE", "MERCADO_PAGO"] as const;
type BillingProviderOption = (typeof providerOptions)[number];

function subscriptionsPath(search: string, role?: UserRole): string {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (role) params.set("role", role);
  const query = params.toString();
  return `/admin/subscriptions${query ? `?${query}` : ""}`;
}

function displayValue(value?: string | null): string {
  return value?.trim() ? value : "Não vinculado";
}

function displayDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "Sem registro";
}

function activationSourceLabel(value?: string): string {
  if (value === "WEBHOOK_PAYMENT") return "Webhook de pagamento";
  if (value === "ADMIN_OR_MANUAL") return "Administrativo/manual";
  return "Não ativa";
}

function ActivationEvidence({ account }: { account: SubscriptionAccount }) {
  return (
    <View className="gap-2 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-sm font-semibold text-ink dark:text-white">Ativação financeira</Text>
        <Text className="rounded-full border border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70 px-3 py-1 text-xs font-semibold text-muted dark:text-[#D1D5DB]">
          {activationSourceLabel(account.billing_activation_source)}
        </Text>
      </View>
      <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Última cobrança: {displayDate(account.billing_last_checkout_at)}
      </Text>
      <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Checkout: {displayValue(account.billing_last_checkout_preference_id)}
      </Text>
      <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Último webhook: {displayDate(account.billing_last_webhook_at)}
      </Text>
      <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Evento webhook: {displayValue(account.billing_last_webhook_event_id)}
      </Text>
      <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Status externo: {displayValue(account.billing_last_webhook_status)}
      </Text>
      <Text selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Pagamento recebido: {displayDate(account.billing_last_payment_received_at)}
      </Text>
      {account.billing_activation_blocker ? (
        <View className="rounded-xl border border-primaryDark/30 bg-primaryDark/15 px-4 py-3">
          <Text className="text-xs font-semibold text-ink dark:text-white">Motivo sem ativação</Text>
          <Text className="mt-1 text-xs leading-5 text-muted dark:text-[#D1D5DB]">{account.billing_activation_blocker}</Text>
        </View>
      ) : (
        <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
          Nenhum bloqueio financeiro atual registrado para esta assinatura.
        </Text>
      )}
    </View>
  );
}

function validateBillingReferenceForm(
  provider: BillingProviderOption,
  customerId: string,
  subscriptionId: string,
  lastEventId: string
): string[] {
  const customer = customerId.trim();
  const subscription = subscriptionId.trim();
  const event = lastEventId.trim();
  if (provider === "NONE") {
    return customer || subscription || event ? ["Remova os IDs externos para usar o provedor NONE."] : [];
  }

  const errors: string[] = [];
  if (!customer) errors.push("Informe o ID externo do cliente.");
  if (!subscription) errors.push("Informe o ID externo da assinatura.");
  if (provider === "MERCADO_PAGO") {
    if (customer.length > 150) errors.push("Referência de cliente Mercado Pago muito longa.");
    if (event.length > 160) errors.push("ID de evento Mercado Pago muito longo.");
  }
  return errors;
}

function BillingReferenceForm({
  account,
  history,
  mercadoPagoReady
}: {
  account: SubscriptionAccount;
  history: AuditLogEntry[];
  mercadoPagoReady: boolean;
}) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<BillingProviderOption>(
    (account.billing_provider as BillingProviderOption | null) ?? "NONE"
  );
  const [customerId, setCustomerId] = useState(account.billing_customer_id ?? "");
  const [subscriptionId, setSubscriptionId] = useState(account.billing_subscription_id ?? "");
  const [lastEventId, setLastEventId] = useState(account.billing_last_event_id ?? "");
  const validationErrors = validateBillingReferenceForm(provider, customerId, subscriptionId, lastEventId);
  const canSave = validationErrors.length === 0;
  const canCreateCheckout = mercadoPagoReady && account.status === "ACTIVE";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
      queryClient.invalidateQueries({ queryKey: ["billing-reference-audit"] });
    }
  });
  const createMercadoPagoCheckout = useMutation({
    mutationFn: () =>
      apiRequest<MercadoPagoCheckout>("/admin/mercado-pago/checkout-preference", {
        method: "POST",
        body: JSON.stringify({
          user_id: account.id,
          reason: "admin checkout preference"
        })
      }),
    onSuccess: async (checkout) => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
      queryClient.invalidateQueries({ queryKey: ["billing-reference-audit"] });
      await Linking.openURL(checkout.checkout_url);
    }
  });

  return (
    <View className="gap-3 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
      <Text className="text-sm font-semibold text-ink dark:text-white">Referência externa de cobrança</Text>
      <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
        Vincula referências do Mercado Pago. Esta tela não confirma pagamento sem webhook ou ação administrativa.
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
                selected ? "border-primary bg-primaryLight" : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"
              }`}
              onPress={() => {
                setProvider(option);
                if (option === "NONE") {
                  setCustomerId("");
                  setSubscriptionId("");
                  setLastEventId("");
                }
              }}
            >
              <Text className={`text-xs font-semibold ${selected ? "text-ink dark:text-white" : "text-ink dark:text-white"}`}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <Field label="Customer ID externo" value={customerId} onChangeText={setCustomerId} maxLength={120} />
      <Field label="Subscription ID externo" value={subscriptionId} onChangeText={setSubscriptionId} maxLength={120} />
      <Field label="Último evento webhook" value={lastEventId} onChangeText={setLastEventId} maxLength={160} />
      {validationErrors.length > 0 ? (
        <View className="rounded-xl border border-primaryDark/30 bg-primaryDark/15 px-4 py-3">
          {validationErrors.map((error) => (
            <Text key={error} className="text-xs leading-5 text-rose">
              - {error}
            </Text>
          ))}
        </View>
      ) : (
        <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
          Referência visualmente válida. A confirmação financeira continua dependendo do webhook real.
        </Text>
      )}
      <ErrorText message={updateReference.error?.message} />
      <Button
        label="Salvar referência"
        tone="soft"
        loading={updateReference.isPending}
        disabled={!canSave}
        onPress={() => updateReference.mutate()}
      />
      <ErrorText message={createMercadoPagoCheckout.error?.message} />
      <Button
        label="Criar checkout Mercado Pago"
        tone="soft"
        loading={createMercadoPagoCheckout.isPending}
        disabled={!canCreateCheckout}
        onPress={() => createMercadoPagoCheckout.mutate()}
      />
      {canCreateCheckout ? (
        <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
          O link abre o Checkout Pro real do Mercado Pago. A assinatura só deve virar ativa depois do webhook validado.
        </Text>
      ) : (
        <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
          Checkout disponível apenas com Mercado Pago configurado e conta comercial aprovada.
        </Text>
      )}
      {history.length > 0 ? (
        <View className="gap-2 rounded-xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/45 p-3">
          <Text className="text-xs font-semibold text-ink dark:text-white">Histórico recente</Text>
          {history.slice(0, 3).map((entry) => (
            <Text key={entry.id} selectable className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
              {new Date(entry.created_at).toLocaleString()} - {String(entry.metadata?.billing_provider ?? "NONE")}
            </Text>
          ))}
        </View>
      ) : null}
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
  const billingReferenceAudit = useQuery({
    queryKey: ["billing-reference-audit"],
    queryFn: () => apiRequest<AuditLogEntry[]>("/admin/audit-logs?resource_type=billing_reference&limit=100"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const billingConfig = useQuery({
    queryKey: ["admin-billing-config"],
    queryFn: () => apiRequest<BillingConfig>("/admin/billing-config"),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
    }
  });
  const archiveAccount = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      apiRequest("/admin/archive-account", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          reason: reason.trim() || "admin archive"
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-billing-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
      queryClient.invalidateQueries({ queryKey: ["billing-reference-audit"] });
    }
  });

  const accounts = subscriptions.data ?? [];
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
          title="Assinaturas"
          subtitle="Controle de planos pagos com Mercado Pago real, sem checkout público."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 980, gap: 16 }}>
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
                  <Text className={`text-sm font-semibold ${selected ? "text-ink dark:text-white" : "text-ink dark:text-white"}`}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Motivo da alteração" value={reason} onChangeText={setReason} />
          <ErrorText message={subscriptions.error?.message ?? updateStatus.error?.message ?? archiveAccount.error?.message} />
          <ErrorText message={billingConfig.error?.message} />
          <Card>
            <Text className="text-base font-semibold text-ink dark:text-white">Mercado Pago</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
              {mercadoPagoReady
                ? "Checkout administrativo real habilitado para contas comerciais aprovadas."
                : "Checkout administrativo bloqueado até configurar Mercado Pago no Render."}
            </Text>
          </Card>
          {subscriptions.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}
          {accounts.length === 0 && !subscriptions.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">Nenhuma conta paga encontrada.</Text>
          ) : null}

          <View className="gap-3">
            {accounts.map((account: SubscriptionAccount) => (
              <Card key={account.id}>
                <Text className="text-lg font-semibold text-ink dark:text-white">{account.full_name}</Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{account.email}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Perfil: {account.role}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Conta: {account.status}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">Plano: {planLabel(account.subscription_plan)}</Text>
                <Text className="text-sm text-muted dark:text-[#D1D5DB]">
                  Assinatura: {subscriptionStatusLabel(account.subscription_status)}
                </Text>
                <View className="gap-1 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
                  <Text className="text-sm font-semibold text-ink dark:text-white">Gateway futuro</Text>
                  <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
                    Provedor: {displayValue(account.billing_provider)}
                  </Text>
                  <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
                    Customer: {displayValue(account.billing_customer_id)}
                  </Text>
                  <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
                    Subscription: {displayValue(account.billing_subscription_id)}
                  </Text>
                  <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
                    Último evento: {displayValue(account.billing_last_event_id)}
                  </Text>
                </View>
                <ActivationEvidence account={account} />
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  Trial e Ativo liberam recursos pagos. Pendente e Cancelado bloqueiam acesso pago sem afetar
                  dados do usuário.
                </Text>
                <BillingReferenceForm
                  account={account}
                  mercadoPagoReady={mercadoPagoReady}
                  history={(billingReferenceAudit.data ?? []).filter(
                    (entry: AuditLogEntry) => entry.target_user_id === account.id
                  )}
                />
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
                  {account.status === "REJECTED" ||
                  account.email.startsWith("qa-") ||
                  account.email.endsWith("@example.com") ? (
                    <Button
                      label="Arquivar conta"
                      tone="danger"
                      disabled={account.status === "ARCHIVED" || archiveAccount.isPending}
                      onPress={() => archiveAccount.mutate({ userId: account.id })}
                    />
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
