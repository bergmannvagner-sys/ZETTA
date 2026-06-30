import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, ErrorText, Field } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { BillingPendingAlertStatus, EmailConfig, EmailConfigUpdateRequest } from "@/types/auth";

function SwitchChip({
  active,
  label,
  onPress
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary/15" : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"}`}
      onPress={onPress}
    >
      <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-muted dark:text-[#D1D5DB]"}`}>{label}</Text>
    </Pressable>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 px-4 py-3">
      <Text className="flex-1 text-sm text-ink dark:text-white">{label}</Text>
      <Text className={`text-sm font-semibold ${ok ? "text-primary" : "text-rose"}`}>{ok ? "Configurado" : "Pendente"}</Text>
    </View>
  );
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function currentValue(value?: string | null): string {
  return value?.trim() ?? "";
}

function parseOptionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
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
  const queryClient = useQueryClient();
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

  const data = config.data;
  const status = alertStatus.data;

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [adminAlertEmail, setAdminAlertEmail] = useState("");
  const [passwordResetUrl, setPasswordResetUrl] = useState("");
  const [billingPendingAlertsAutoEnabled, setBillingPendingAlertsAutoEnabled] = useState(false);
  const [billingPendingAlertsAutoDays, setBillingPendingAlertsAutoDays] = useState("7");
  const [billingPendingAlertsAutoIntervalHours, setBillingPendingAlertsAutoIntervalHours] = useState("24");
  const [billingPendingAlertsAutoLimit, setBillingPendingAlertsAutoLimit] = useState("50");

  useEffect(() => {
    if (!data) {
      return;
    }
    setSmtpHost(currentValue(data.smtp_host));
    setSmtpPort(String(data.smtp_port));
    setSmtpUsername(currentValue(data.smtp_username));
    setSmtpPassword("");
    setSmtpFromEmail(currentValue(data.smtp_from_email));
    setSmtpUseTls(data.smtp_use_tls);
    setAdminAlertEmail(currentValue(data.admin_alert_email));
    setPasswordResetUrl(currentValue(data.password_reset_url));
    setBillingPendingAlertsAutoEnabled(data.billing_pending_alerts_auto_enabled);
    setBillingPendingAlertsAutoDays(String(data.billing_pending_alerts_auto_days));
    setBillingPendingAlertsAutoIntervalHours(String(data.billing_pending_alerts_auto_interval_hours));
    setBillingPendingAlertsAutoLimit(String(data.billing_pending_alerts_auto_limit));
  }, [data]);

  const smtpPortValue = parseOptionalInteger(smtpPort);
  const daysValue = parseOptionalInteger(billingPendingAlertsAutoDays);
  const intervalValue = parseOptionalInteger(billingPendingAlertsAutoIntervalHours);
  const limitValue = parseOptionalInteger(billingPendingAlertsAutoLimit);
  const numberInvalid =
    (smtpPort.trim().length > 0 && smtpPortValue === null) ||
    (billingPendingAlertsAutoDays.trim().length > 0 && daysValue === null) ||
    (billingPendingAlertsAutoIntervalHours.trim().length > 0 && intervalValue === null) ||
    (billingPendingAlertsAutoLimit.trim().length > 0 && limitValue === null);
  const dirty =
    normalizeText(smtpHost) !== normalizeText(currentValue(data?.smtp_host)) ||
    smtpPort.trim() !== String(data?.smtp_port ?? 587) ||
    normalizeText(smtpUsername) !== normalizeText(currentValue(data?.smtp_username)) ||
    normalizeText(smtpFromEmail) !== normalizeText(currentValue(data?.smtp_from_email)) ||
    smtpUseTls !== Boolean(data?.smtp_use_tls) ||
    normalizeText(adminAlertEmail) !== normalizeText(currentValue(data?.admin_alert_email)) ||
    normalizeText(passwordResetUrl) !== normalizeText(currentValue(data?.password_reset_url)) ||
    billingPendingAlertsAutoEnabled !== Boolean(data?.billing_pending_alerts_auto_enabled) ||
    billingPendingAlertsAutoDays.trim() !== String(data?.billing_pending_alerts_auto_days ?? 7) ||
    billingPendingAlertsAutoIntervalHours.trim() !== String(data?.billing_pending_alerts_auto_interval_hours ?? 24) ||
    billingPendingAlertsAutoLimit.trim() !== String(data?.billing_pending_alerts_auto_limit ?? 50) ||
    smtpPassword.trim().length > 0;

  const saveConfig = useMutation({
    mutationFn: () => {
      const payload: EmailConfigUpdateRequest = {};
      const smtpHostValue = normalizeText(smtpHost);
      const smtpUsernameValue = normalizeText(smtpUsername);
      const smtpFromEmailValue = normalizeText(smtpFromEmail);
      const adminAlertEmailValue = normalizeText(adminAlertEmail);
      const passwordResetUrlValue = normalizeText(passwordResetUrl);

      if (smtpHostValue !== normalizeText(currentValue(data?.smtp_host))) {
        payload.smtp_host = smtpHostValue || null;
      }
      if (smtpPort.trim() === "") {
        payload.smtp_port = null;
      } else if (smtpPortValue !== null && smtpPortValue !== (data?.smtp_port ?? 587)) {
        payload.smtp_port = smtpPortValue;
      }
      if (smtpUsernameValue !== normalizeText(currentValue(data?.smtp_username))) {
        payload.smtp_username = smtpUsernameValue || null;
      }
      if (smtpPassword.trim()) {
        payload.smtp_password = smtpPassword.trim();
      }
      if (smtpFromEmailValue !== normalizeText(currentValue(data?.smtp_from_email))) {
        payload.smtp_from_email = smtpFromEmailValue || null;
      }
      if (smtpUseTls !== Boolean(data?.smtp_use_tls)) {
        payload.smtp_use_tls = smtpUseTls;
      }
      if (adminAlertEmailValue !== normalizeText(currentValue(data?.admin_alert_email))) {
        payload.admin_alert_email = adminAlertEmailValue || null;
      }
      if (passwordResetUrlValue !== normalizeText(currentValue(data?.password_reset_url))) {
        payload.password_reset_url = passwordResetUrlValue || null;
      }
      if (billingPendingAlertsAutoEnabled !== Boolean(data?.billing_pending_alerts_auto_enabled)) {
        payload.billing_pending_alerts_auto_enabled = billingPendingAlertsAutoEnabled;
      }
      if (billingPendingAlertsAutoDays.trim() === "") {
        payload.billing_pending_alerts_auto_days = null;
      } else if (daysValue !== null && daysValue !== (data?.billing_pending_alerts_auto_days ?? 7)) {
        payload.billing_pending_alerts_auto_days = daysValue;
      }
      if (billingPendingAlertsAutoIntervalHours.trim() === "") {
        payload.billing_pending_alerts_auto_interval_hours = null;
      } else if (intervalValue !== null && intervalValue !== (data?.billing_pending_alerts_auto_interval_hours ?? 24)) {
        payload.billing_pending_alerts_auto_interval_hours = intervalValue;
      }
      if (billingPendingAlertsAutoLimit.trim() === "") {
        payload.billing_pending_alerts_auto_limit = null;
      } else if (limitValue !== null && limitValue !== (data?.billing_pending_alerts_auto_limit ?? 50)) {
        payload.billing_pending_alerts_auto_limit = limitValue;
      }

      return apiRequest<EmailConfig>("/admin/email-config", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-email-config"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-billing-pending-alert-status"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-operations-summary"] });
    }
  });

  if (user?.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Segurança"
          title="Configuração de e-mail"
          subtitle="Edite SMTP, alertas e rota de recuperação de senha sem expor segredos no app."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 880, gap: 16 }}>
          <ErrorText message={config.error?.message} />
          <ErrorText message={alertStatus.error?.message} />
          {config.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando...</Text> : null}

          <Card>
            <View className="flex-row flex-wrap gap-2">
              <Badge label="Edição real" tone="info" />
              <Badge label="SMTP persistido" tone="warning" />
              <Badge label="Segredo preservado" tone="soft" />
            </View>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              Campos de texto e números em branco retornam ao padrão do backend. A senha SMTP não é reexibida e só muda
              quando você digita um novo valor.
            </Text>
          </Card>

          <Card>
            <Text className="text-lg font-semibold text-ink dark:text-white">Editor operacional</Text>
            <Field label="Servidor SMTP" value={smtpHost} onChangeText={setSmtpHost} autoCapitalize="none" />
            <Field label="Porta SMTP" value={smtpPort} onChangeText={setSmtpPort} keyboardType="number-pad" />
            <Field label="Usuário SMTP" value={smtpUsername} onChangeText={setSmtpUsername} autoCapitalize="none" />
            <Field
              label="Senha SMTP"
              value={smtpPassword}
              onChangeText={setSmtpPassword}
              secureTextEntry
              placeholder="Deixe em branco para manter"
            />
            <Field
              label="E-mail remetente SMTP"
              value={smtpFromEmail}
              onChangeText={setSmtpFromEmail}
              autoCapitalize="none"
            />
            <Field
              label="E-mail de alerta administrativo"
              value={adminAlertEmail}
              onChangeText={setAdminAlertEmail}
              autoCapitalize="none"
            />
            <Field
              label="URL de recuperação de senha"
              value={passwordResetUrl}
              onChangeText={setPasswordResetUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View className="flex-row flex-wrap gap-2">
              <SwitchChip
                active={smtpUseTls}
                label={smtpUseTls ? "TLS ativo" : "TLS desligado"}
                onPress={() => setSmtpUseTls((value) => !value)}
              />
              <SwitchChip
                active={billingPendingAlertsAutoEnabled}
                label={billingPendingAlertsAutoEnabled ? "Alertas automáticos ativos" : "Alertas automáticos desligados"}
                onPress={() => setBillingPendingAlertsAutoEnabled((value) => !value)}
              />
            </View>
            <Field
              label="Prazo mínimo para alerta em dias"
              value={billingPendingAlertsAutoDays}
              onChangeText={setBillingPendingAlertsAutoDays}
              keyboardType="number-pad"
            />
            <Field
              label="Intervalo entre alertas em horas"
              value={billingPendingAlertsAutoIntervalHours}
              onChangeText={setBillingPendingAlertsAutoIntervalHours}
              keyboardType="number-pad"
            />
            <Field
              label="Limite de alertas por execução"
              value={billingPendingAlertsAutoLimit}
              onChangeText={setBillingPendingAlertsAutoLimit}
              keyboardType="number-pad"
            />
            <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
              O backend usa essas chaves para envio de e-mail, recuperação de senha e automação de pendências financeiras.
            </Text>

            <ErrorText message={saveConfig.error?.message} />
            <Button
              label="Salvar configuração"
              loading={saveConfig.isPending}
              disabled={!dirty || numberInvalid}
              onPress={() => saveConfig.mutate()}
            />
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
                <StatusLine label="Servidor SMTP" ok={data.smtp_host_configured} />
                <StatusLine label="Usuário SMTP" ok={data.smtp_username_configured} />
                <StatusLine label="Senha SMTP" ok={data.smtp_password_configured} />
                <StatusLine label="E-mail remetente SMTP" ok={data.smtp_from_email_configured} />
                <StatusLine label="E-mail de alerta administrativo" ok={data.admin_alert_recipient_configured} />
                <StatusLine label="URL de recuperação de senha" ok={data.password_reset_url_configured} />
                <StatusLine label="Alertas financeiros automáticos" ok={data.billing_pending_alerts_auto_enabled} />
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
