import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Badge, Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { BillingPendingAlertStatus, EmailConfig } from "@/types/auth";

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 px-4 py-3">
      <Text className="flex-1 text-sm text-ink dark:text-white">{label}</Text>
      <Text className={`text-sm font-semibold ${ok ? "text-primary" : "text-rose"}`}>
        {ok ? "Configurado" : "Pendente"}
      </Text>
    </View>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sem registro";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("pt-BR");
}

export default function AdminEmailConfig() {
  const user = useAuthStore((state) => state.user);
  const config = useQuery({
    queryKey: ["admin-email-config"],
    queryFn: () => apiRequest<EmailConfig>("/admin/email-config"),
    enabled: user?.role === "SUPER_ADMIN"
  });
  const alertStatus = useQuery({
    queryKey: ["admin-billing-pending-alert-status"],
    queryFn: () => apiRequest<BillingPendingAlertStatus>("/admin/billing-pending-alert-status"),
    enabled: user?.role === "SUPER_ADMIN"
  });

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  const data = config.data;
  const status = alertStatus.data;

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Segurança"
          title="Configuração de e-mail"
          subtitle="Verifique o SMTP usado pela recuperação de senha. Segredos nunca aparecem nesta tela."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <ErrorText message={config.error?.message} />
          <ErrorText message={alertStatus.error?.message} />
          {config.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}

          <Card>
            <View className="flex-row flex-wrap gap-2">
              <Badge label="Somente leitura" tone="info" />
              <Badge label="SMTP via backend" tone="warning" />
              <Badge label="Sem formulário no app" tone="soft" />
            </View>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              A recuperação de senha já depende do backend. Aqui você confere apenas a prontidão operacional e a
              automação de alertas.
            </Text>
          </Card>

          {data ? (
            <>
              <Card>
                <Text className="text-lg font-semibold text-ink dark:text-white">
                  {data.smtp_configured ? "SMTP pronto para produção" : "SMTP ainda incompleto"}
                </Text>
                <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  Porta configurada: {data.smtp_port}. TLS: {data.smtp_use_tls ? "ativo" : "desativado"}.
                </Text>
                <StatusLine label="SMTP_HOST" ok={data.smtp_host_configured} />
                <StatusLine label="SMTP_USERNAME" ok={data.smtp_username_configured} />
                <StatusLine label="SMTP_PASSWORD" ok={data.smtp_password_configured} />
                <StatusLine label="SMTP_FROM_EMAIL" ok={data.smtp_from_email_configured} />
                <StatusLine label="E-mail de alerta administrativo" ok={data.admin_alert_recipient_configured} />
                <StatusLine label="PASSWORD_RESET_URL" ok={data.password_reset_url_configured} />
                <StatusLine label="BILLING_PENDING_ALERTS_AUTO_ENABLED" ok={data.billing_pending_alerts_auto_enabled} />
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  Alertas financeiros: {data.billing_pending_alerts_auto_days} dia(s), intervalo de{" "}
                  {data.billing_pending_alerts_auto_interval_hours}h, limite {data.billing_pending_alerts_auto_limit}.
                </Text>
              </Card>

              {status ? (
                <Card>
                  <Text className="text-lg font-semibold text-ink dark:text-white">Automação de pendências financeiras</Text>
                  <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                    Rotina {status.auto_enabled ? "ativa" : "inativa"}: {status.days_threshold} dia(s), intervalo de{" "}
                    {status.interval_hours}h, limite {status.limit}.
                  </Text>
                  <StatusLine label="Destinatário administrativo" ok={status.admin_recipient_configured} />
                  <StatusLine label="Execução recente registrada" ok={status.recent_scheduled_alert_exists} />
                  <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                    Última execução: {formatDateTime(status.last_scheduled_alert_at)}
                  </Text>
                  <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                    Próximo disparo permitido: {formatDateTime(status.next_allowed_alert_at)}
                  </Text>
                  <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                    Último resultado: {status.last_scheduled_alerted_accounts ?? 0} alertada(s),{" "}
                    {status.last_scheduled_pending_accounts ?? 0} pendente(s),{" "}
                    {status.last_scheduled_checked_accounts ?? 0} verificada(s).
                  </Text>
                  <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    E-mail no último agendamento:{" "}
                    {status.last_scheduled_email_sent === null || status.last_scheduled_email_sent === undefined
                      ? "sem registro"
                      : status.last_scheduled_email_sent
                        ? "enviado"
                        : "não enviado"}
                    .
                  </Text>
                </Card>
              ) : null}

              <Card>
                <Text className="text-lg font-semibold text-ink dark:text-white">Checklist do Render</Text>
                {data.required_env_names.map((name: string) => (
                  <Text key={name} selectable className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
                    - {name}
                  </Text>
                ))}
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  Após configurar, rode o smoke de recuperação localmente e confirme o recebimento do e-mail.
                </Text>
              </Card>
            </>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
