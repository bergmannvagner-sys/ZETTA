import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import {
  CareReminder,
  CareReminderCategory,
  completeCareReminder,
  createCareReminder,
  listCareReminders
} from "@/lib/assistant";

const templates: {
  labelKey: string;
  titleKey: string;
  category: CareReminderCategory;
  noteKey: string;
}[] = [
  { labelKey: "routine.water", titleKey: "routine.waterTitle", category: "WATER", noteKey: "routine.waterNote" },
  { labelKey: "routine.pause", titleKey: "routine.pauseTitle", category: "PAUSE", noteKey: "routine.pauseNote" },
  { labelKey: "routine.breathe", titleKey: "routine.breatheTitle", category: "BREATHING", noteKey: "routine.breatheNote" },
  { labelKey: "routine.rest", titleKey: "routine.restTitle", category: "REST", noteKey: "routine.restNote" }
];

const categoryLabels: Record<CareReminderCategory, string> = {
  WATER: "routine.water",
  PAUSE: "routine.pause",
  BREATHING: "routine.breathe",
  REST: "routine.rest",
  ROUTINE: "home.care.routine",
  CUSTOM: "Livre"
};

function ReminderCard({
  item,
  categoryLabel,
  onComplete,
  completing
}: {
  item: CareReminder;
  categoryLabel: string;
  onComplete: (id: string) => void;
  completing: boolean;
}) {
  const { t } = useI18n();

  return (
    <Card>
      <View className="gap-1">
        <Text className="text-base font-semibold text-ink dark:text-white">{item.title}</Text>
        <Text className="text-sm text-muted dark:text-[#D1D5DB]">
          {categoryLabel}
          {item.time_local ? ` - ${item.time_local}` : ""}
        </Text>
        {item.note ? <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{item.note}</Text> : null}
        {item.last_completed_at ? <Text className="text-xs text-primary">{t("routine.doneRecently")}</Text> : null}
      </View>
      <Button label={t("routine.markDone")} tone="soft" loading={completing} onPress={() => onComplete(item.id)} />
    </Card>
  );
}

export default function Routine() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [title, setTitle] = useState(t("routine.waterTitle"));
  const [category, setCategory] = useState<CareReminderCategory>("WATER");
  const [timeLocal, setTimeLocal] = useState("");
  const [note, setNote] = useState(t("routine.waterNote"));
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

  const wideRoutine = width >= 860;
  const orbSize = wideRoutine ? Math.min(248, Math.max(188, width * 0.3)) : Math.min(214, Math.max(168, width * 0.56));
  const activeReminders = reminders.data ?? [];

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <View style={{ alignItems: "center", gap: 14, maxWidth: 640, width: "100%" }}>
          <AnimatedOrb state="calm" size={orbSize} />

          <View className="gap-2">
            <Text className="text-xs font-semibold text-primary text-center">{t("routine.kicker")}</Text>
            <Text className="text-3xl font-semibold text-ink dark:text-white text-center">{t("routine.title")}</Text>
            <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB] text-center">{t("routine.subtitle")}</Text>
          </View>

          <View className="flex-row flex-wrap justify-center gap-2">
            {templates.map((item) => (
              <Pressable
                key={item.labelKey}
                accessibilityRole="button"
                onPress={() => {
                  setTitle(t(item.titleKey));
                  setCategory(item.category);
                  setNote(t(item.noteKey));
                }}
                className={`rounded-full border px-4 py-3 ${
                  category === item.category
                    ? "border-primary bg-primaryLight"
                    : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/70"
                }`}
              >
                <Text className={category === item.category ? "font-semibold text-ink dark:text-white" : "text-ink dark:text-white"}>
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          <Card>
            <Field label={t("routine.reminder")} value={title} onChangeText={setTitle} maxLength={120} />
            <Field
              label={t("routine.time")}
              value={timeLocal}
              onChangeText={(value) => setTimeLocal(value.replace(/[^\d:]/g, "").slice(0, 5))}
              placeholder="09:30"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Field
              label={t("routine.note")}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={1000}
            />
            <ErrorText message={createMutation.error?.message || reminders.error?.message || completeMutation.error?.message} />
            <Button
              label={t("routine.create")}
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
          </Card>

          <View className="gap-3">
            <Text className="text-sm font-semibold text-muted dark:text-[#D1D5DB]">{t("routine.active")}</Text>
            {reminders.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text> : null}

            {activeReminders.length === 0 ? (
              <Card>
                <Text className="text-base leading-6 text-muted dark:text-[#D1D5DB]">{t("routine.empty")}</Text>
              </Card>
            ) : (
              <View style={{ flexDirection: wideRoutine ? "row" : "column", flexWrap: wideRoutine ? "wrap" : "nowrap", gap: 12 }}>
                {activeReminders.map((item: CareReminder) => (
                  <View
                    key={item.id}
                    style={{
                      flexBasis: wideRoutine ? "48%" : "100%",
                      flexGrow: 1,
                      minWidth: wideRoutine ? 240 : undefined
                    }}
                  >
                    <ReminderCard
                      item={item}
                      categoryLabel={t(categoryLabels[item.category])}
                      onComplete={(id) => completeMutation.mutate(id)}
                      completing={completeMutation.isPending}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}
