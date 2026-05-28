import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { PaidAccessGate } from "@/components/paid-access-gate";
import { Screen } from "@/components/screen";
import { Card, ErrorText } from "@/components/ui";
import { hasPaidAccess } from "@/lib/billing";
import { getNR1Report } from "@/lib/emotional";
import { useAuthStore } from "@/store/auth-store";

function Indicator({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <View className="rounded-xl border border-white/10 bg-ink/35 p-4">
      <Text className="text-sm text-muted">{label}</Text>
      <Text selectable className="text-2xl font-semibold text-white">{String(value)}</Text>
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
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">NR-1</Text>
        <Text className="text-3xl font-semibold text-white">Saude emocional organizacional</Text>
        <Text className="text-base leading-6 text-muted">
          Indicadores coletivos e autorizados. Este painel nao exibe conversas, diario ou dados individuais.
        </Text>
      </View>

      {user?.role !== "COMPANY" || !paidAccess ? (
        <PaidAccessGate user={user} resourceLabel="Painel NR-1 e indicadores organizacionais" />
      ) : (
        <>
          {report.isLoading ? <Text className="text-muted">Gerando visao agregada...</Text> : null}
          <ErrorText message={report.error?.message} />

          {report.data ? (
            <>
          <Card>
            <Text selectable className="text-base leading-6 text-white">{report.data.summary}</Text>
            <Text selectable className="text-sm text-muted">
              Participantes autorizados: {report.data.participant_count}
            </Text>
            <Text selectable className="text-sm text-muted">
              Privacidade: {report.data.suppressed ? "amostra suprimida" : "dados agregados"}
            </Text>
          </Card>

          <View className="gap-3">
            <Text className="text-base font-semibold text-white">Indicadores coletivos</Text>
            <Indicator label="Intensidade media" value={indicators.average_intensity} />
            <Indicator label="Estresse medio" value={indicators.average_stress} />
            <Indicator label="Ansiedade media" value={indicators.average_anxiety} />
            <Indicator label="Registros considerados" value={indicators.logs_count} />
            <Indicator label="Minimo para exibir" value={indicators.minimum_participants} />
          </View>
            </>
          ) : (
            <Card>
              <Text className="text-base leading-6 text-muted">
                A visao NR-1 aparece quando houver autorizacoes suficientes para preservar anonimato.
              </Text>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
