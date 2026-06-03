import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import {
  exportPrivacyData,
  getConsentStatus,
  getPrivacyAudit,
  PrivacyAuditEntry,
  PrivacyExport,
  revokeConsent
} from "@/lib/privacy";

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString("pt-BR") : "Sem registro";
}

function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    CONSENT_ACCEPTED: "Consentimento aceito",
    CONSENT_REVOKED: "Consentimento revogado",
    DATA_EXPORT_REQUESTED: "Exportacao solicitada",
    CHAT_MESSAGE_CREATED: "Mensagem registrada",
    SOS_EVENT_CREATED: "SOS registrado",
    SHARING_CONSENT_GRANTED: "Compartilhamento autorizado",
    SHARING_CONSENT_REVOKED: "Compartilhamento revogado"
  };
  return labels[action] ?? action.replace(/_/gu, " ");
}

export default function Privacy() {
  const queryClient = useQueryClient();
  const [lastExport, setLastExport] = useState<PrivacyExport | null>(null);
  const consent = useQuery({ queryKey: ["lgpd-consent"], queryFn: getConsentStatus });
  const audit = useQuery({ queryKey: ["privacy-audit"], queryFn: getPrivacyAudit });
  const exportData = useMutation({
    mutationFn: exportPrivacyData,
    onSuccess: (data) => {
      setLastExport(data);
      queryClient.invalidateQueries({ queryKey: ["privacy-audit"] });
    }
  });
  const revoke = useMutation({
    mutationFn: revokeConsent,
    onSuccess: () => {
      setLastExport(null);
      queryClient.invalidateQueries({ queryKey: ["lgpd-consent"] });
      queryClient.invalidateQueries({ queryKey: ["privacy-audit"] });
    }
  });

  return (
    <Screen>
      <Text className="text-3xl font-semibold text-white">Privacidade</Text>
      <Card>
        <Text className="text-base leading-6 text-white">
          A Bergmann usa seus dados para oferecer suporte emocional e seguranca da conta. Dados
          sensiveis devem ser tratados com consentimento, controle de acesso e logs auditaveis.
        </Text>
      </Card>
      <Card>
        <Text className="text-base leading-6 text-muted">
          Empresas e instituicoes nao podem acessar dados individuais. Contas profissionais passam
          por verificacao antes de acessar recursos clinicos.
        </Text>
        <Text selectable className="text-sm text-muted">
          Consentimento: {consent.data?.accepted ? "aceito" : "pendente"}
        </Text>
        <Text selectable className="text-xs text-muted">
          Politica: {consent.data?.policy_version} | aceite: {formatDate(consent.data?.accepted_at)}
        </Text>
      </Card>

      <Card>
        <Text className="text-lg font-semibold text-white">Controle dos seus dados</Text>
        <Text className="text-sm leading-5 text-muted">
          Exporte seus registros pessoais ou revogue o consentimento. A revogacao bloqueia recursos emocionais ate um
          novo aceite.
        </Text>
        <ErrorText message={exportData.error?.message ?? revoke.error?.message} />
        <View className="gap-2">
          <Button label="Exportar meus dados" tone="soft" loading={exportData.isPending} onPress={() => exportData.mutate()} />
          <Button
            label="Revogar consentimento"
            tone="danger"
            loading={revoke.isPending}
            disabled={!consent.data?.accepted}
            onPress={() => revoke.mutate()}
          />
        </View>
      </Card>

      {lastExport ? (
        <Card>
          <Text className="text-lg font-semibold text-white">Ultima exportacao</Text>
          <Text selectable className="text-sm text-muted">Gerada em {formatDate(lastExport.exported_at)}</Text>
          <Text className="text-sm leading-5 text-muted">
            Diario: {lastExport.journal_entries.length} | Humor: {lastExport.emotion_logs.length} | Chat:{" "}
            {lastExport.chat_sessions.length} | SOS: {lastExport.sos_events.length}
          </Text>
          <Text className="text-xs leading-5 text-muted">
            O pacote completo fica em memoria nesta tela e nao inclui senha, tokens ou hash do documento.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text className="text-lg font-semibold text-white">Historico recente</Text>
        {audit.data?.length ? (
          <View className="gap-3">
            {audit.data.map((entry: PrivacyAuditEntry) => (
              <View key={entry.id} className="gap-1 border-b border-white/10 pb-3">
                <Text className="text-sm font-semibold text-white">{auditLabel(entry.action)}</Text>
                <Text className="text-xs text-muted">{formatDate(entry.created_at)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-muted">
            {audit.isLoading ? "Carregando eventos..." : "Nenhum evento de privacidade recente."}
          </Text>
        )}
      </Card>
    </Screen>
  );
}
