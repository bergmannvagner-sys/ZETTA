import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { EmotionLog, getAuthorizedUserDetail, JournalEntry } from "@/lib/emotional";

export default function ProfessionalUserDetail() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const detail = useQuery({
    queryKey: ["professional-authorized-user", userId],
    queryFn: () => getAuthorizedUserDetail(userId),
    enabled: Boolean(userId)
  });

  const data = detail.data;

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">ACOMPANHAMENTO</Text>
        <Text className="text-3xl font-semibold text-white">Detalhe autorizado</Text>
        <Text className="text-base leading-6 text-muted">
          Informacoes visiveis somente dentro do consentimento concedido pela pessoa.
        </Text>
      </View>

      {detail.isLoading ? <Text className="text-muted">Carregando acompanhamento...</Text> : null}
      <ErrorText message={detail.error?.message} />

      {data ? (
        <View className="gap-3">
          <Card>
            <Text selectable className="text-base font-semibold text-white">{data.full_name}</Text>
            <Text selectable className="text-sm text-muted">{data.email}</Text>
            <Text selectable className="text-sm leading-5 text-muted">
              Categorias: {data.categories.join(", ")}
            </Text>
            <Text selectable className="text-sm text-muted">
              Compartilhamento: {data.summary_only ? "apenas resumo" : "detalhes autorizados"}
            </Text>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-white">Resumo emocional</Text>
            <Text selectable className="text-sm text-muted">
              Humor recente: {data.latest_mood ?? "nao autorizado ou indisponivel"}
            </Text>
            <Text selectable className="text-sm text-muted">
              Intensidade media: {data.average_intensity ?? "nao autorizada ou indisponivel"}
            </Text>
            {data.latest_report ? (
              <>
                <Text selectable className="text-sm text-muted">Risco indicado: {data.latest_report.risk_level}</Text>
                <Text selectable className="text-sm leading-5 text-muted">{data.latest_report.summary}</Text>
              </>
            ) : (
              <Text className="text-sm leading-5 text-muted">Resumo IA nao autorizado ou ainda nao gerado.</Text>
            )}
          </Card>

          {data.recent_emotions.length ? (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-muted">Registros emocionais autorizados</Text>
              {data.recent_emotions.map((item: EmotionLog) => (
                <Card key={item.id}>
                  <Text selectable className="text-base font-semibold text-white">{item.mood}</Text>
                  <Text selectable className="text-sm text-muted">Intensidade: {item.intensity}</Text>
                  {item.note ? <Text selectable className="text-sm leading-5 text-muted">{item.note}</Text> : null}
                </Card>
              ))}
            </View>
          ) : null}

          {data.journal_entries.length ? (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-muted">Diario autorizado</Text>
              {data.journal_entries.map((item: JournalEntry) => (
                <Card key={item.id}>
                  <Text selectable className="text-sm leading-5 text-white">{item.content}</Text>
                  {item.tags.length ? (
                    <Text selectable className="text-xs text-muted">Tags: {item.tags.join(", ")}</Text>
                  ) : null}
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
