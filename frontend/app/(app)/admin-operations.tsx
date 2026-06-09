import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AdminOperationsSummary } from "@/types/auth";

function displayDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString("pt-BR") : "Sem registro";
}

function readinessLabel(ok: boolean): string {
  return ok ? "Pronto" : "Pendente";
}

export default function AdminOperations() {
  const user = useAuthStore((state) => state.user);
  const summary = useQuery({
    queryKey: ["admin-operations-summary"],
    queryFn: () => apiRequest<AdminOperationsSummary>("/admin/operations-summary"),
    enabled: user?.role === "SUPER_ADMIN"
  });

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  const data = summary.data;

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Admin"
          title="Resumo operacional"
          subtitle="Visão curta para decidir o que precisa de ação: financeiro, webhooks, alertas e configuração."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 760, gap: 16 }}>
          <ErrorText message={summary.error?.message} />

          <View className="gap-3">
            <Card>
              <Text className="text-lg font-semibold text-ink dark:text-white">Financeiro</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Pendências atuais: {data?.pending_financial_accounts ?? 0}
              </Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Automação: {data?.billing_alert_auto_enabled ? "ativa" : "inativa"} | última execução{" "}
                {displayDate(data?.billing_last_scheduled_alert_at)}
              </Text>
              <Button
                label="Abrir pendências"
                tone="soft"
                onPress={() => router.push("/(app)/admin-billing-pending" as never)}
              />
            </Card>

            <Card>
              <Text className="text-lg font-semibold text-ink dark:text-white">Webhooks</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">Eventos recentes: {data?.recent_webhook_events ?? 0}</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Erros: {data?.webhook_error_events ?? 0} | duplicados: {data?.duplicate_webhook_events ?? 0}
              </Text>
              {data?.last_webhook_error ? (
                <Text selectable className="text-xs leading-5 text-rose">
                  Último erro: {data.last_webhook_error} em {displayDate(data.last_webhook_error_at)}
                </Text>
              ) : null}
              <Button
                label="Abrir webhooks"
                tone="soft"
                onPress={() => router.push("/(app)/admin-billing-webhooks" as never)}
              />
            </Card>

            <Card>
              <Text className="text-lg font-semibold text-ink dark:text-white">Alertas</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">Alertas recentes: {data?.recent_alerts ?? 0}</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                E-mails não enviados: {data?.unsent_alerts ?? 0}
              </Text>
              {data?.last_alert_error ? (
                <Text selectable className="text-xs leading-5 text-rose">
                  Último erro: {data.last_alert_error} em {displayDate(data.last_alert_error_at)}
                </Text>
              ) : null}
              <Button
                label="Abrir alertas"
                tone="soft"
                onPress={() => router.push("/(app)/admin-alerts" as never)}
              />
            </Card>

            <Card>
              <Text className="text-lg font-semibold text-ink dark:text-white">Configuração</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Mercado Pago: {readinessLabel(Boolean(data?.mercado_pago_ready))}
              </Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Webhook ativo: {readinessLabel(Boolean(data?.billing_webhooks_enabled))}
              </Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                SMTP: {readinessLabel(Boolean(data?.smtp_configured))}
              </Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                Destinatário admin: {readinessLabel(Boolean(data?.admin_alert_recipient_configured))}
              </Text>
              <View className="gap-2">
                <Button
                  label="Configurar pagamentos"
                  tone="soft"
                  onPress={() => router.push("/(app)/admin-billing-config" as never)}
                />
                <Button
                label="Configurar e-mail"
                  tone="soft"
                  onPress={() => router.push("/(app)/admin-email-config" as never)}
                />
              </View>
            </Card>
          </View>
        </View>
      </View>
    </Screen>
  );
}
