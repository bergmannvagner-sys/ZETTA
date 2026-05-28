import { useMutation } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText } from "@/components/ui";
import { createMyEmotionalReport } from "@/lib/emotional";

export default function EmotionalReport() {
  const report = useMutation({ mutationFn: createMyEmotionalReport });
  const metadata = report.data?.metadata ?? {};

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">RESUMO</Text>
        <Text className="text-3xl font-semibold text-white">Relatorio emocional</Text>
        <Text className="text-base leading-6 text-muted">
          Um resumo para sua propria percepcao. Ele nao substitui avaliacao medica ou psicologica.
        </Text>
      </View>

      <Button
        label={report.data ? "Atualizar resumo" : "Gerar resumo emocional"}
        loading={report.isPending}
        onPress={() => report.mutate()}
      />
      <ErrorText message={report.error?.message} />

      {report.data ? (
        <Card>
          <Text selectable className="text-sm font-semibold text-mint">Risco: {report.data.risk_level}</Text>
          <Text selectable className="text-base leading-6 text-white">{report.data.summary}</Text>
          <View className="gap-1 pt-2">
            {"emotion_logs" in metadata ? (
              <Text selectable className="text-sm text-muted">Registros emocionais: {String(metadata.emotion_logs)}</Text>
            ) : null}
            {"journal_entries" in metadata ? (
              <Text selectable className="text-sm text-muted">Entradas no diario: {String(metadata.journal_entries)}</Text>
            ) : null}
            {"average_intensity" in metadata ? (
              <Text selectable className="text-sm text-muted">Intensidade media: {String(metadata.average_intensity)}</Text>
            ) : null}
            {"latest_mood" in metadata ? (
              <Text selectable className="text-sm text-muted">Humor recente: {String(metadata.latest_mood)}</Text>
            ) : null}
          </View>
        </Card>
      ) : (
        <Card>
          <Text className="text-base leading-6 text-muted">
            O resumo aparece aqui depois que voce registrar humor ou diario. O Bergmann trabalha com sinais,
            nao com diagnosticos.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
