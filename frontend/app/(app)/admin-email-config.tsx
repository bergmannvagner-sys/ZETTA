import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { BillingPendingAlertStatus, EmailConfig } from "@/types/auth";

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink/35 px-4 py-3">
      <Text className="flex-1 text-sm text-white">{label}</Text>
      <Text className={`text-sm font-semibold ${ok ? "text-mint" : "text-rose"}`}>
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
      <View className="gap-2">
        <Text className="text-sm font-semibold tracking-[4px] text-mint">SEGURANCA</Text>
        <Text className="text-3xl font-semibold text-white">Configuração de email</Text>
        <Text className="text-base leading-6 text-muted">
          Verifique o SMTP usado pela recuperação de senha. Segredos nunca aparecem nesta tela.
        </Text>
      </View>

      <ErrorText message={config.error?.message} />
      <ErrorText message={alertStatus.error?.message} />
      {config.isLoading ? <Text className="text-muted">Carregando...</Text> : null}

      {data ? (
        <>
          <Card>
            <Text className="text-lg font-semibold text-white">
              {data.smtp_configured ? "SMTP pronto para produção" : "SMTP ainda incompleto"}
            </Text>
            <Text className="text-sm leading-5 text-muted">
              Porta configurada: {data.smtp_port}. TLS: {data.smtp_use_tls ? "ativo" : "desativado"}.
            </Text>
            <StatusLine label="SMTP_HOST" ok={data.smtp_host_configured} />
            <StatusLine label="SMTP_USERNAME" ok={data.smtp_username_configured} />
            <StatusLine label="SMTP_PASSWORD" ok={data.smtp_password_configured} />
            <StatusLine label="SMTP_FROM_EMAIL" ok={data.smtp_from_email_configured} />
            <StatusLine label="ADMIN_ALERT_EMAIL ou SUPER_ADMIN_EMAIL" ok={data.admin_alert_recipient_configured} />
            <StatusLine label="PASSWORD_RESET_URL" ok={data.password_reset_url_configured} />
            <StatusLine label="BILLING_PENDING_ALERTS_AUTO_ENABLED" ok={data.billing_pending_alerts_auto_enabled} />
            <Text className="text-xs leading-5 text-muted">
              Alertas financeiros: {data.billing_pending_alerts_auto_days} dia(s), intervalo de{" "}
              {data.billing_pending_alerts_auto_interval_hours}h, limite {data.billing_pending_alerts_auto_limit}.
            </Text>
          </Card>

          {status ? (
            <Card>
              <Text className="text-lg font-semibold text-white">Automacao de pendencias financeiras</Text>
              <Text className="text-sm leading-5 text-muted">
                Rotina {status.auto_enabled ? "ativa" : "inativa"}: {status.days_threshold} dia(s), intervalo de{" "}
                {status.interval_hours}h, limite {status.limit}.
              </Text>
              <StatusLine label="Destinatario administrativo" ok={status.admin_recipient_configured} />
              <StatusLine label="Execucao recente registrada" ok={status.recent_scheduled_alert_exists} />
              <Text className="text-sm leading-6 text-muted">
                Ultima execucao: {formatDateTime(status.last_scheduled_alert_at)}
              </Text>
              <Text className="text-sm leading-6 text-muted">
                Proximo disparo permitido: {formatDateTime(status.next_allowed_alert_at)}
              </Text>
              <Text className="text-sm leading-6 text-muted">
                Ultimo resultado: {status.last_scheduled_alerted_accounts ?? 0} alertada(s),{" "}
                {status.last_scheduled_pending_accounts ?? 0} pendente(s),{" "}
                {status.last_scheduled_checked_accounts ?? 0} verificada(s).
              </Text>
              <Text className="text-xs leading-5 text-muted">
                Email no ultimo agendamento:{" "}
                {status.last_scheduled_email_sent === null || status.last_scheduled_email_sent === undefined
                  ? "sem registro"
                  : status.last_scheduled_email_sent
                    ? "enviado"
                    : "nao enviado"}
                .
              </Text>
            </Card>
          ) : null}

          <Card>
            <Text className="text-lg font-semibold text-white">Checklist Render</Text>
            {data.required_env_names.map((name: string) => (
              <Text key={name} selectable className="text-sm leading-6 text-muted">
                - {name}
              </Text>
            ))}
            <Text className="text-xs leading-5 text-muted">
              Após configurar, rode o smoke de recuperação localmente e confirme o recebimento do email.
            </Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
