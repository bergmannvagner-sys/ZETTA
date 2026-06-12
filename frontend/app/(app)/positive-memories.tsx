import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { QuietPanel } from "@/components/emotional";
import { Screen } from "@/components/screen";
import { Badge, ErrorText } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { JournalEntry, listJournalEntries } from "@/lib/emotional";

const positivePattern = /consegui|vit[oó]ria|bom|boa|gratid[aã]o|feliz|melhor|orgulho|calma|caminh|sair de casa/iu;

function positiveEntries(entries: JournalEntry[]) {
  return entries
    .filter((entry) => entry.tags.some((tag) => tag.includes("grat")) || positivePattern.test(entry.content))
    .slice(0, 8);
}

export default function PositiveMemories() {
  const { language, t } = useI18n();
  const entries = useQuery({ queryKey: ["journal-entries"], queryFn: listJournalEntries });
  const memories = positiveEntries(entries.data ?? []);

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker={t("positive.kicker")}
          title={t("positive.title")}
          subtitle={t("positive.subtitle")}
          orbState="calm"
        />

        <View style={{ width: "100%", maxWidth: 960, gap: 16 }}>
          {entries.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text> : null}
          <ErrorText message={entries.error?.message} />
          <QuietPanel>
            <View className="flex-row flex-wrap gap-2">
              <Badge label={t("positive.kicker")} tone="info" />
              <Badge label={t("report.kicker")} tone="soft" />
            </View>
            <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("positive.subtitle")}</Text>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
              {t("positive.scanned", {
                evaluated: entries.data?.length ?? 0,
                selected: memories.length
              })}
            </Text>
          </QuietPanel>
          {memories.length ? (
            <View className="gap-3">
              {memories.map((entry) => (
                <QuietPanel key={entry.id}>
                  <Text className="text-sm text-primary">
                    {new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(entry.created_at))}
                  </Text>
                  <Text selectable className="text-base leading-7 text-ink dark:text-white">
                    "{entry.content}"
                  </Text>
                  <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">{t("positive.revisit")}</Text>
                </QuietPanel>
              ))}
            </View>
          ) : (
            <QuietPanel>
              <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("positive.empty")}</Text>
            </QuietPanel>
          )}
        </View>
      </View>
    </Screen>
  );
}
