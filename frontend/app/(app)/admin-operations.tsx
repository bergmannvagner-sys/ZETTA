import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import {
  AdminAlertEntry,
  BillingConfig,
  BillingPendingAlertStatus,
  BillingWebhookMonitorEntry,
  EmailConfig,
  PaymentAdapterCapability,
  SubscriptionAccount
} from "@/types/auth";

function displayDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString("pt-BR") : "Sem registro";
}

function readinessLabel(ok: boolean): string {
  return ok ? "Pronto" : "Pendente";
}

function latestError(items: Array<{ error?: string | null; created_at?: string; received_at?: string }>) {
  return items.find((item) => item.error);
}

export default function AdminOperations() {
  const user = useAuthStore((state) => state.user);
  const pendingAccounts = useQuery({
    queryKey: ["admin-operations-billing-pending"],
    queryFn: () => apiRequest<SubscriptionAccount[]>("/admin/billing-pending-accounts"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const webhooks = useQuery({
    queryKey: ["admin-operations-webhooks"],
    queryFn: () => apiRequest<BillingWebhookMonitorEntry[]>("/admin/billing-webhooks?provider=MERCADO_PAGO&limit=100"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const alerts = useQuery({
    queryKey: ["admin-operations-alerts"],
    queryFn: () => apiRequest<AdminAlertEntry[]>("/admin/alerts?limit=100"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const alertStatus = useQuery({
    queryKey: ["admin-operations-alert-status"],
    queryFn: () => apiRequest<BillingPendingAlertStatus>("/admin/billing-pending-alert-status"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const billingConfig = useQuery({
    queryKey: ["admin-operations-billing-config"],
    queryFn: () => apiRequest<BillingConfig>("/admin/billing-config"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const emailConfig = useQuery({
    queryKey: ["admin-operations-email-config"],
    queryFn: () => apiRequest<EmailConfig>("/admin/email-config"),
    enabled: user?.role === "SUPER_ADMIN"
  });

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  const pending = pendingAccounts.data ?? [];
  const webhookItems = webhooks.data ?? [];
  const alertItems = alerts.data ?? [];
  const webhookErrors = webhookItems.filter((entry: BillingWebhookMonitorEntry) => entry.processing_status === "error");
  const duplicateWebhooks = webhookItems.filter((entry: BillingWebhookMonitorEntry) => entry.duplicate);
  const unsentAlerts = alertItems.filter((entry: AdminAlertEntry) => !entry.email_sent);
  const lastWebhookError = latestError(webhookItems);
  const lastAlertError = latestError(alertItems);
  const mercadoPago = billingConfig.data?.provider_capabilities.find(
    (capability: PaymentAdapterCapability) => capability.provider === "MERCADO_PAGO"
  );

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">ADMIN</Text>
        <Text className="text-3xl font-semibold text-white">Resumo operacional</Text>
        <Text className="text-base leading-6 text-muted">
          Visao curta para decidir o que precisa de acao: financeiro, webhooks, alertas e configuracao.
        </Text>
      </View>

      <ErrorText
        message={
          pendingAccounts.error?.message ??
          webhooks.error?.message ??
          alerts.error?.message ??
          alertStatus.error?.message ??
          billingConfig.error?.message ??
          emailConfig.error?.message
        }
      />

      <View className="gap-3">
        <Card>
          <Text className="text-lg font-semibold text-white">Financeiro</Text>
          <Text className="text-sm leading-5 text-muted">Pendencias atuais: {pending.length}</Text>
          <Text className="text-sm leading-5 text-muted">
            Automacao: {alertStatus.data?.auto_enabled ? "ativa" : "inativa"} | ultima execucao{" "}
            {displayDate(alertStatus.data?.last_scheduled_alert_at)}
          </Text>
          <Button
            label="Abrir pendencias"
            tone="soft"
            onPress={() => router.push("/(app)/admin-billing-pending" as never)}
          />
        </Card>

        <Card>
          <Text className="text-lg font-semibold text-white">Webhooks</Text>
          <Text className="text-sm leading-5 text-muted">Eventos recentes: {webhookItems.length}</Text>
          <Text className="text-sm leading-5 text-muted">
            Erros: {webhookErrors.length} | duplicados: {duplicateWebhooks.length}
          </Text>
          {lastWebhookError ? (
            <Text selectable className="text-xs leading-5 text-rose">
              Ultimo erro: {lastWebhookError.error} em {displayDate(lastWebhookError.received_at)}
            </Text>
          ) : null}
          <Button
            label="Abrir webhooks"
            tone="soft"
            onPress={() => router.push("/(app)/admin-billing-webhooks" as never)}
          />
        </Card>

        <Card>
          <Text className="text-lg font-semibold text-white">Alertas</Text>
          <Text className="text-sm leading-5 text-muted">Alertas recentes: {alertItems.length}</Text>
          <Text className="text-sm leading-5 text-muted">Emails nao enviados: {unsentAlerts.length}</Text>
          {lastAlertError ? (
            <Text selectable className="text-xs leading-5 text-rose">
              Ultimo erro: {lastAlertError.error} em {displayDate(lastAlertError.created_at)}
            </Text>
          ) : null}
          <Button
            label="Abrir alertas"
            tone="soft"
            onPress={() => router.push("/(app)/admin-alerts" as never)}
          />
        </Card>

        <Card>
          <Text className="text-lg font-semibold text-white">Configuracao</Text>
          <Text className="text-sm leading-5 text-muted">
            Mercado Pago: {readinessLabel(Boolean(mercadoPago?.checkout_enabled))}
          </Text>
          <Text className="text-sm leading-5 text-muted">
            Webhook ativo: {readinessLabel(Boolean(billingConfig.data?.webhooks_enabled))}
          </Text>
          <Text className="text-sm leading-5 text-muted">
            SMTP: {readinessLabel(Boolean(emailConfig.data?.smtp_configured))}
          </Text>
          <Text className="text-sm leading-5 text-muted">
            Destinatario admin: {readinessLabel(Boolean(emailConfig.data?.admin_alert_recipient_configured))}
          </Text>
          <View className="gap-2">
            <Button
              label="Configurar pagamentos"
              tone="soft"
              onPress={() => router.push("/(app)/admin-billing-config" as never)}
            />
            <Button
              label="Configurar email"
              tone="soft"
              onPress={() => router.push("/(app)/admin-email-config" as never)}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
