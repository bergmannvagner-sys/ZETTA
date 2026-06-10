import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { AuthGate } from "@/components/auth-gate";
import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, EmptyState, ErrorText, Loading } from "@/components/ui";
import {
  exportPrivacyData,
  getConsentStatus,
  getPrivacyAudit,
  PrivacyAuditEntry,
  PrivacyExport,
  revokeConsent
} from "@/lib/privacy";
import { useAuthStore } from "@/store/auth-store";

const PRIVACY_POINTS = [
  {
    title: "Cuidado emocional",
    body: "Mensagens, diário, humor e relatórios ajudam a contextualizar o suporte sem perder o controle da pessoa."
  },
  {
    title: "Auditoria pessoal",
    body: "Aceite, exportação, revogação e compartilhamento ficam registrados para rastreabilidade."
  },
  {
    title: "Compartilhamento controlado",
    body: "Perfis clínicos e institucionais acessam apenas o que foi autorizado explicitamente."
  },
  {
    title: "Segregação de dados",
    body: "Empresas e áreas administrativas não recebem dados individuais protegidos por consentimento."
  }
] as const;

const PRIVACY_RIGHTS = [
  {
    title: "Exportar dados",
    body: "Gere uma cópia dos seus registros pessoais e da trilha de consentimento."
  },
  {
    title: "Revogar acesso",
    body: "Interrompa recursos sensíveis até um novo aceite da política vigente."
  },
  {
    title: "Revisar histórico",
    body: "Veja quais ações foram registradas no seu perfil e quando aconteceram."
  },
  {
    title: "Voltar ao consentimento",
    body: "Abra a tela de aceite sempre que quiser revisar a base legal do tratamento."
  }
] as const;

function formatDate(value?: string | null): string {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value))
    : "Sem registro";
}

function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    CONSENT_ACCEPTED: "Consentimento aceito",
    CONSENT_REVOKED: "Consentimento revogado",
    DATA_EXPORT_REQUESTED: "Exportação solicitada",
    CHAT_MESSAGE_CREATED: "Mensagem registrada",
    SOS_EVENT_CREATED: "SOS registrado",
    SHARING_CONSENT_GRANTED: "Compartilhamento autorizado",
    SHARING_CONSENT_REVOKED: "Compartilhamento revogado",
    JOURNAL_ENTRY_CREATED: "Entrada de diário",
    EMOTION_LOG_CREATED: "Registro de humor",
    EMOTIONAL_REPORT_CREATED: "Relatório emocional",
    CARE_REMINDER_CREATED: "Lembrete criado",
    CARE_REMINDER_COMPLETED: "Lembrete concluído",
    USER_REGISTERED: "Conta criada",
    USER_LOGIN: "Login realizado",
    TOKEN_REFRESHED: "Sessão renovada",
    ACCOUNT_APPROVED: "Conta aprovada",
    ACCOUNT_REJECTED: "Conta rejeitada",
    ACCOUNT_ARCHIVED: "Conta arquivada",
    NR1_REPORT_VIEWED: "Relatório NR-1 visualizado",
    SUBSCRIPTION_STATUS_UPDATED: "Assinatura atualizada",
    BILLING_WEBHOOK_PROCESSED: "Webhook financeiro processado",
    TELECARE_SESSION_REQUESTED: "Sessão solicitada",
    TELECARE_SESSION_STATUS_UPDATED: "Status da sessão alterado"
  };

  return labels[action] ?? action.replace(/_/gu, " ").toLowerCase();
}

function isAuthError(message?: string | null): boolean {
  return message === "error.authRequired" || message === "error.sessionExpired";
}

function isNonAuthError(message?: string | null): boolean {
  return Boolean(message) && !isAuthError(message);
}

export default function Privacy() {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [lastExport, setLastExport] = useState<PrivacyExport | null>(null);
  const isWide = width >= 900;
  const orbSize = Math.min(236, Math.max(176, width * 0.44));
  const sessionKey = user?.id ?? "anonymous";
  const hasSession = hydrated && Boolean(accessToken) && Boolean(user?.id);

  useEffect(() => {
    setLastExport(null);
  }, [sessionKey]);

  const consent = useQuery({
    queryKey: ["lgpd-consent", sessionKey],
    queryFn: getConsentStatus,
    enabled: hasSession,
    retry: false
  });
  const audit = useQuery({
    queryKey: ["privacy-audit", sessionKey],
    queryFn: getPrivacyAudit,
    enabled: hasSession,
    retry: false
  });

  const exportData = useMutation({
    mutationFn: exportPrivacyData,
    onSuccess: (data) => {
      setLastExport(data);
      void queryClient.invalidateQueries({ queryKey: ["privacy-audit", sessionKey] });
    }
  });
  const revoke = useMutation({
    mutationFn: revokeConsent,
    onSuccess: () => {
      setLastExport(null);
      void queryClient.invalidateQueries({ queryKey: ["lgpd-consent", sessionKey] });
      void queryClient.invalidateQueries({ queryKey: ["privacy-audit", sessionKey] });
    }
  });

  const authError =
    isAuthError(consent.error?.message) ||
    isAuthError(audit.error?.message) ||
    isAuthError(exportData.error?.message) ||
    isAuthError(revoke.error?.message);
  const showAuthGate = !hasSession || authError;
  const nonAuthError =
    [consent.error?.message, audit.error?.message, exportData.error?.message, revoke.error?.message].find(isNonAuthError) ??
    undefined;
  const accepted = consent.data?.accepted === true;
  const consentTone = accepted ? "success" : "warning";

  const overviewPanel = (
    <Card>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text className="text-lg font-semibold text-ink dark:text-white">O que esta área cobre</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            A privacidade aqui é operacional: ela protege cuidado emocional, auditoria e compartilhamento autorizado.
          </Text>
        </View>

        <View
          style={{
            flexDirection: isWide ? "row" : "column",
            flexWrap: isWide ? "wrap" : "nowrap",
            gap: 12
          }}
        >
          {PRIVACY_POINTS.map((item) => (
            <View
              key={item.title}
              style={{
                flexBasis: isWide ? "48%" : "100%",
                flexGrow: 1,
                minWidth: isWide ? 240 : undefined
              }}
              className="gap-1 rounded-2xl border border-primaryLight/70 bg-surface/80 p-4 dark:border-[#4C1D95]/35 dark:bg-[#1C1630]/55"
            >
              <Text className="text-sm font-semibold text-ink dark:text-white">{item.title}</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{item.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );

  const rightsPanel = (
    <Card>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text className="text-lg font-semibold text-ink dark:text-white">Seus controles diretos</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            Você pode exportar, revisar e revogar o tratamento sempre que precisar.
          </Text>
        </View>

        <View
          style={{
            flexDirection: isWide ? "row" : "column",
            flexWrap: isWide ? "wrap" : "nowrap",
            gap: 12
          }}
        >
          {PRIVACY_RIGHTS.map((item) => (
            <View
              key={item.title}
              style={{
                flexBasis: isWide ? "48%" : "100%",
                flexGrow: 1,
                minWidth: isWide ? 220 : undefined
              }}
              className="gap-1 rounded-2xl border border-primaryLight/70 bg-surfaceSoft/90 p-4 dark:border-[#4C1D95]/35 dark:bg-[#261D42]/45"
            >
              <Text className="text-sm font-semibold text-ink dark:text-white">{item.title}</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{item.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );

  const actionPanel = showAuthGate ? (
    <Card>
      <AuthGate
        title="Entre para continuar."
        body="Faça login para exportar seus dados, revisar a auditoria e revogar o consentimento LGPD."
        resourceLabel="Privacidade e exportação"
      />
    </Card>
  ) : (
    <Card>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text className="text-lg font-semibold text-ink dark:text-white">Controle dos seus dados</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            Use este painel para exportar registros pessoais ou interromper o uso sensível até um novo aceite.
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Badge label={accepted ? "Consentimento ativo" : "Consentimento pendente"} tone={consentTone} />
          <Badge label={`Política ${consent.data?.policy_version ?? "..."}`} tone="info" />
          <Badge label={consent.isFetching || audit.isFetching ? "Sincronizando" : "Atualizado"} tone="soft" />
        </View>

        <View className="gap-1">
          <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
            {consent.data?.accepted_at
              ? `Aceito em ${formatDate(consent.data.accepted_at)}`
              : "Ainda não há consentimento ativo nesta conta."}
          </Text>
          <Text className="text-xs text-muted dark:text-[#D1D5DB]">
            A revogação suspende recursos sensíveis até um novo aceite.
          </Text>
        </View>

        <ErrorText message={nonAuthError} />

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: isWide ? "row" : "column", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Exportar dados" loading={exportData.isPending} onPress={() => exportData.mutate()} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Ver consentimento" tone="soft" onPress={() => router.push("/(app)/consent" as never)} />
            </View>
          </View>

          <View style={{ flexDirection: isWide ? "row" : "column", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Política pública" tone="soft" onPress={() => router.push("/privacy-policy" as never)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Termos de uso" tone="soft" onPress={() => router.push("/terms" as never)} />
            </View>
          </View>

          <Button
            label="Revogar consentimento"
            tone="danger"
            loading={revoke.isPending}
            disabled={!accepted}
            onPress={() => revoke.mutate()}
          />
        </View>
      </View>
    </Card>
  );

  const exportPanel = lastExport ? (
    <Card>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text className="text-lg font-semibold text-ink dark:text-white">Última exportação</Text>
          <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
            Gerada em {formatDate(lastExport.exported_at)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: isWide ? "row" : "column",
            flexWrap: isWide ? "wrap" : "nowrap",
            gap: 12
          }}
        >
          {[
            { label: "Consentimentos", value: lastExport.consent_records.length },
            {
              label: "Compartilhamentos",
              value: lastExport.sharing_consents_granted.length + lastExport.sharing_consents_received.length
            },
            { label: "Diário", value: lastExport.journal_entries.length },
            { label: "Humor", value: lastExport.emotion_logs.length },
            { label: "Relatórios", value: lastExport.emotional_reports.length },
            { label: "Chat", value: lastExport.chat_sessions.length },
            { label: "SOS", value: lastExport.sos_events.length },
            { label: "Lembretes", value: lastExport.care_reminders.length }
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexBasis: isWide ? "48%" : "100%",
                flexGrow: 1,
                minWidth: isWide ? 160 : undefined
              }}
              className="gap-1 rounded-2xl border border-primaryLight/70 bg-surfaceSoft/90 p-4 dark:border-[#4C1D95]/35 dark:bg-[#261D42]/45"
            >
              <Text className="text-xs font-semibold text-primary">{item.label}</Text>
              <Text className="text-2xl font-semibold text-ink dark:text-white">{item.value}</Text>
            </View>
          ))}
        </View>

        <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
          O pacote inclui apenas registros pessoais e trilhas de uso. Senhas, tokens e segredos técnicos não entram
          nessa exportação.
        </Text>
      </View>
    </Card>
  ) : null;

  const auditPanel = (
    <Card>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text className="text-lg font-semibold text-ink dark:text-white">Histórico recente</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
            A trilha abaixo mostra os últimos eventos de privacidade e cuidado registrados na sua conta.
          </Text>
        </View>

        {audit.isLoading ? (
          <Loading label="common.loading" />
        ) : audit.data?.length ? (
          <View className="gap-3">
            {audit.data.map((entry: PrivacyAuditEntry) => (
              <View key={entry.id} className="gap-1 border-b border-primaryLight pb-3 dark:border-[#4C1D95]/40">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-sm font-semibold text-ink dark:text-white">{auditLabel(entry.action)}</Text>
                  <Badge label={entry.resource_type.replace(/_/gu, " ")} tone="soft" />
                </View>
                <Text className="text-xs text-muted dark:text-[#D1D5DB]">{formatDate(entry.created_at)}</Text>
                {entry.resource_id ? (
                  <Text className="text-xs text-muted dark:text-[#D1D5DB]">Recurso: {entry.resource_id}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="Nada por aqui ainda" body="Nenhum evento de privacidade recente foi encontrado." />
        )}
      </View>
    </Card>
  );

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          kicker="Acesso protegido"
          orbState="calm"
          orbSize={orbSize}
          subtitle="Revise o que a Bergmann registra, exporte seus dados e revogue o consentimento sem perder visibilidade do histórico de auditoria."
          title="Privacidade e controle"
        />

        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}>
          <Badge label="Dados pessoais" tone="info" />
          <Badge label="Consentimento LGPD" tone="soft" />
          <Badge label="Logs auditáveis" tone="success" />
        </View>

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          {actionPanel}
          {overviewPanel}
          {rightsPanel}
          {exportPanel}
          {auditPanel}
        </View>
      </View>
    </Screen>
  );
}
