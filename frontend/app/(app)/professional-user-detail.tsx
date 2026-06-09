import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { PaidAccessGate } from "@/components/paid-access-gate";
import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { hasPaidAccess } from "@/lib/billing";
import { EmotionLog, getAuthorizedUserDetail, JournalEntry } from "@/lib/emotional";
import { useAuthStore } from "@/store/auth-store";

export default function ProfessionalUserDetail() {
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const detail = useQuery({
    queryKey: ["professional-authorized-user", userId],
    queryFn: () => getAuthorizedUserDetail(userId),
    enabled: Boolean(userId) && user?.role === "PSYCHOLOGIST" && paidAccess
  });

  const data = detail.data;

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="Acompanhamento"
          title="Detalhe autorizado"
          subtitle="Informações visíveis somente dentro do consentimento concedido pela pessoa."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 760, gap: 14 }}>
          {user?.role !== "PSYCHOLOGIST" || !paidAccess ? (
            <PaidAccessGate user={user} resourceLabel="Detalhe de acompanhamento autorizado" />
          ) : (
            <>
              {detail.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Carregando acompanhamento...</Text> : null}
              <ErrorText message={detail.error?.message} />

              {data ? (
                <View className="gap-3">
                  <Card>
                    <Text selectable className="text-base font-semibold text-ink dark:text-white">{data.full_name}</Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{data.email}</Text>
                    <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                      Categorias: {data.categories.join(", ")}
                    </Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                      Compartilhamento: {data.summary_only ? "apenas resumo" : "detalhes autorizados"}
                    </Text>
                  </Card>

                  <Card>
                    <Text className="text-base font-semibold text-ink dark:text-white">Resumo emocional</Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                      Humor recente: {data.latest_mood ?? "não autorizado ou indisponível"}
                    </Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                      Intensidade média: {data.average_intensity ?? "não autorizada ou indisponível"}
                    </Text>
                    {data.latest_report ? (
                      <>
                        <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                          Risco indicado: {data.latest_report.risk_level}
                        </Text>
                        <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                          {data.latest_report.summary}
                        </Text>
                      </>
                    ) : (
                      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                        Resumo IA não autorizado ou ainda não gerado.
                      </Text>
                    )}
                  </Card>

                  {data.recent_emotions.length ? (
                    <View className="gap-3">
                      <Text className="text-sm font-semibold text-muted dark:text-[#D1D5DB]">
                        Registros emocionais autorizados
                      </Text>
                      {data.recent_emotions.map((item: EmotionLog) => (
                        <Card key={item.id}>
                          <Text selectable className="text-base font-semibold text-ink dark:text-white">
                            {item.mood}
                          </Text>
                          <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">Intensidade: {item.intensity}</Text>
                          {item.note ? (
                            <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{item.note}</Text>
                          ) : null}
                        </Card>
                      ))}
                    </View>
                  ) : null}

                  {data.journal_entries.length ? (
                    <View className="gap-3">
                      <Text className="text-sm font-semibold text-muted dark:text-[#D1D5DB]">Diário autorizado</Text>
                      {data.journal_entries.map((item: JournalEntry) => (
                        <Card key={item.id}>
                          <Text selectable className="text-sm leading-5 text-ink dark:text-white">
                            {item.content}
                          </Text>
                          {item.tags.length ? (
                            <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
                              Tags: {item.tags.join(", ")}
                            </Text>
                          ) : null}
                        </Card>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
