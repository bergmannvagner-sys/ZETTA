import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { PaidAccessGate } from "@/components/paid-access-gate";
import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { hasPaidAccess } from "@/lib/billing";
import { getNR1Report } from "@/lib/emotional";
import { useAuthStore } from "@/store/auth-store";

function Indicator({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <View className="rounded-xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-4">
      <Text className="text-sm text-muted dark:text-[#D1D5DB]">{label}</Text>
      <Text selectable className="text-2xl font-semibold text-ink dark:text-white">{String(value)}</Text>
    </View>
  );
}

export default function NR1() {
  const user = useAuthStore((state) => state.user);
  const paidAccess = hasPaidAccess(user);
  const report = useQuery({
    queryKey: ["nr1-report"],
    queryFn: getNR1Report,
    enabled: user?.role === "COMPANY" && paidAccess
  });
  const indicators = report.data?.indicators ?? {};

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker="NR-1"
          title="Saúde emocional organizacional"
          subtitle="Indicadores coletivos e autorizados. Este painel não exibe conversas, diário ou dados individuais."
          orbState="thinking"
        />

        <View style={{ width: "100%", maxWidth: 760, gap: 14 }}>
          {user?.role !== "COMPANY" || !paidAccess ? (
            <PaidAccessGate user={user} resourceLabel="Painel NR-1 e indicadores organizacionais" />
          ) : (
            <>
              {report.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">Gerando visao agregada...</Text> : null}
              <ErrorText message={report.error?.message} />

              {report.data ? (
                <>
                  <Card>
                    <Text selectable className="text-base leading-6 text-ink dark:text-white">{report.data.summary}</Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                      Participantes autorizados: {report.data.participant_count}
                    </Text>
                    <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                      Privacidade: {report.data.suppressed ? "amostra suprimida" : "dados agregados"}
                    </Text>
                  </Card>

                  <View className="gap-3">
                    <Text className="text-base font-semibold text-ink dark:text-white">Indicadores coletivos</Text>
                    <Indicator label="Intensidade media" value={indicators.average_intensity} />
                    <Indicator label="Estresse medio" value={indicators.average_stress} />
                    <Indicator label="Ansiedade media" value={indicators.average_anxiety} />
                    <Indicator label="Registros considerados" value={indicators.logs_count} />
                    <Indicator label="Minimo para exibir" value={indicators.minimum_participants} />
                  </View>
                </>
              ) : (
                <Card>
                  <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">
                    A visão NR-1 aparece quando houver autorizações suficientes para preservar anonimato.
                  </Text>
                </Card>
              )}
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
