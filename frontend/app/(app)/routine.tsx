import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import {
  CareReminder,
  CareReminderCategory,
  completeCareReminder,
  createCareReminder,
  listCareReminders
} from "@/lib/assistant";

const templates: { label: string; title: string; category: CareReminderCategory; note: string }[] = [
  { label: "Agua", title: "Beber agua", category: "WATER", note: "Um copo pequeno ja ajuda." },
  { label: "Pausa", title: "Pausa curta", category: "PAUSE", note: "Levantar, respirar e soltar os ombros." },
  { label: "Respirar", title: "Respirar 1 minuto", category: "BREATHING", note: "Inspirar devagar e expirar sem pressa." },
  { label: "Descanso", title: "Descansar", category: "REST", note: "Reduzir estimulos por alguns minutos." }
];

const categoryLabels: Record<CareReminderCategory, string> = {
  WATER: "Agua",
  PAUSE: "Pausa",
  BREATHING: "Respiracao",
  REST: "Descanso",
  ROUTINE: "Rotina",
  CUSTOM: "Livre"
};

export default function Routine() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("Beber agua");
  const [category, setCategory] = useState<CareReminderCategory>("WATER");
  const [timeLocal, setTimeLocal] = useState("");
  const [note, setNote] = useState("Um copo pequeno ja ajuda.");
  const reminders = useQuery({
    queryKey: ["care-reminders"],
    queryFn: listCareReminders
  });
  const createMutation = useMutation({
    mutationFn: createCareReminder,
    onSuccess: async () => {
      setTimeLocal("");
      await queryClient.invalidateQueries({ queryKey: ["care-reminders"] });
    }
  });
  const completeMutation = useMutation({
    mutationFn: completeCareReminder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["care-reminders"] });
    }
  });

  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">ROTINA LEVE</Text>
        <Text className="text-3xl font-semibold text-white">Pequenos cuidados</Text>
        <Text className="text-base leading-6 text-muted">
          Lembretes simples para agua, pausa, descanso e respiracao. Sem pressa, sem cobranca.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {templates.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={() => {
              setTitle(item.title);
              setCategory(item.category);
              setNote(item.note);
            }}
            className={`rounded-full border px-4 py-3 ${
              category === item.category ? "border-mint bg-mint" : "border-white/10 bg-surface/70"
            }`}
          >
            <Text className={category === item.category ? "font-semibold text-ink" : "text-white"}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Field label="Lembrete" value={title} onChangeText={setTitle} maxLength={120} />
        <Field
          label="Horario opcional"
          value={timeLocal}
          onChangeText={(value) => setTimeLocal(value.replace(/[^\d:]/g, "").slice(0, 5))}
          placeholder="09:30"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
        <Field
          label="Nota opcional"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={1000}
        />
      </Card>

      <ErrorText message={createMutation.error?.message || reminders.error?.message || completeMutation.error?.message} />
      <Button
        label="Criar lembrete"
        loading={createMutation.isPending}
        disabled={title.trim().length < 2}
        onPress={() =>
          createMutation.mutate({
            title: title.trim(),
            category,
            time_local: timeLocal.trim() || null,
            note: note.trim() || null
          })
        }
      />

      <View className="gap-3">
        <Text className="text-sm font-semibold text-muted">Lembretes ativos</Text>
        {reminders.isLoading ? <Text className="text-muted">Carregando...</Text> : null}
        {reminders.data?.length === 0 ? (
          <Card>
            <Text className="text-base leading-6 text-muted">
              Nenhum lembrete ainda. Escolha um cuidado pequeno para comecar.
            </Text>
          </Card>
        ) : null}
        {reminders.data?.map((item: CareReminder) => (
          <Card key={item.id}>
            <View className="gap-1">
              <Text className="text-base font-semibold text-white">{item.title}</Text>
              <Text className="text-sm text-muted">
                {categoryLabels[item.category]}{item.time_local ? ` - ${item.time_local}` : ""}
              </Text>
              {item.note ? <Text className="text-sm leading-5 text-muted">{item.note}</Text> : null}
              {item.last_completed_at ? (
                <Text className="text-xs text-mint">Concluido recentemente</Text>
              ) : null}
            </View>
            <Button
              label="Marcar feito"
              tone="soft"
              loading={completeMutation.isPending}
              onPress={() => completeMutation.mutate(item.id)}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
