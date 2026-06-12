import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { QuietPanel } from "@/components/emotional";
import { Screen } from "@/components/screen";
import { Badge, ErrorText } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { EmotionLog, JournalEntry, listEmotionLogs, listJournalEntries } from "@/lib/emotional";

type TimelineMonth = {
  key: string;
  label: string;
  logs: EmotionLog[];
  entries: JournalEntry[];
};

function monthKey(value: string) {
  return value.slice(0, 7);
}

function monthLabel(key: string, language: string) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(date);
}

function buildTimeline(logs: EmotionLog[], entries: JournalEntry[], language: string): TimelineMonth[] {
  const months = new Map<string, TimelineMonth>();
  for (const log of logs) {
    const key = monthKey(log.created_at);
    const item = months.get(key) ?? { key, label: monthLabel(key, language), logs: [], entries: [] };
    item.logs.push(log);
    months.set(key, item);
  }
  for (const entry of entries) {
    const key = monthKey(entry.created_at);
    const item = months.get(key) ?? { key, label: monthLabel(key, language), logs: [], entries: [] };
    item.entries.push(entry);
    months.set(key, item);
  }
  return Array.from(months.values()).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6);
}

function monthNarrative(month: TimelineMonth, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!month.logs.length && !month.entries.length) return t("timeline.noSignals");
  const avgIntensity = month.logs.length
    ? Math.round(month.logs.reduce((sum, log) => sum + log.intensity, 0) / month.logs.length)
    : null;
  const latestMood = month.logs[0]?.mood;
  const entryCount = month.entries.length;
  if (avgIntensity !== null && latestMood) {
    return t("timeline.monthWithMood", { mood: latestMood, intensity: avgIntensity, entries: entryCount });
  }
  return t("timeline.monthWithJournal", { entries: entryCount });
}

export default function EmotionalTimeline() {
  const { language, t } = useI18n();
  const emotions = useQuery({ queryKey: ["emotion-logs"], queryFn: listEmotionLogs });
  const entries = useQuery({ queryKey: ["journal-entries"], queryFn: listJournalEntries });
  const timeline = buildTimeline(emotions.data ?? [], entries.data ?? [], language);

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker={t("timeline.kicker")}
          title={t("timeline.title")}
          subtitle={t("timeline.subtitle")}
          orbState="calm"
        />

        <View style={{ width: "100%", maxWidth: 960, gap: 16 }}>
          {emotions.isLoading || entries.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text>
          ) : null}
          <ErrorText message={emotions.error?.message || entries.error?.message} />
          <QuietPanel>
            <View className="flex-row flex-wrap gap-2">
              <Badge label={t("timeline.kicker")} tone="info" />
              <Badge label={t("report.kicker")} tone="soft" />
            </View>
            <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("timeline.subtitle")}</Text>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              {t("report.emotionLogs", { value: emotions.data?.length ?? 0 })} ·{" "}
              {t("report.journalEntries", { value: entries.data?.length ?? 0 })}
            </Text>
          </QuietPanel>
          {timeline.length ? (
            <View className="gap-3">
              {timeline.map((month) => (
                <QuietPanel key={month.key}>
                  <Text className="text-lg font-semibold capitalize text-ink dark:text-white">{month.label}</Text>
                  <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{monthNarrative(month, t)}</Text>
                </QuietPanel>
              ))}
            </View>
          ) : (
            <QuietPanel>
              <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("timeline.empty")}</Text>
            </QuietPanel>
          )}
        </View>
      </View>
    </Screen>
  );
}
