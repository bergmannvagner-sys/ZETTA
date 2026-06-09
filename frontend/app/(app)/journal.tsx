import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field, Header } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { createJournalEntry, JournalEntry, listJournalEntries } from "@/lib/emotional";

function tagList(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export default function Journal() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const entries = useQuery({ queryKey: ["journal-entries"], queryFn: listJournalEntries });
  const mutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: async () => {
      setContent("");
      setTags("");
      await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    }
  });

  const wideJournal = width >= 860;
  const orbSize = wideJournal ? Math.min(248, Math.max(188, width * 0.3)) : Math.min(180, Math.max(168, width * 0.52));
  const recentEntries = entries.data?.slice(0, 3) ?? [];

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: width < 420 ? 18 : 24, width: "100%" }}>
        <View style={{ alignItems: "center", gap: width < 420 ? 12 : 14, maxWidth: 640, width: "100%" }}>
          <AnimatedOrb state="thinking" size={orbSize} />
          <Header align="center" kicker={t("journal.kicker")} title={t("journal.title")} subtitle={t("journal.subtitle")} />
        </View>

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          <Field
            label={t("journal.prompt")}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={6000}
          />

          <Field
            label={t("journal.tags")}
            value={tags}
            onChangeText={setTags}
            placeholder={t("journal.tagsPlaceholder")}
            maxLength={180}
          />

          <ErrorText message={mutation.error?.message} />

          <Button
            label={t("journal.save")}
            loading={mutation.isPending}
            onPress={() => mutation.mutate({ content, tags: tagList(tags) })}
          />

          <View className="gap-3">
            <Text className="text-base font-semibold text-ink dark:text-white">{t("journal.recent")}</Text>
            {entries.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text> : null}
            <ErrorText message={entries.error?.message} />

            {entries.data?.length === 0 ? <Text className="text-muted dark:text-[#D1D5DB]">{t("journal.empty")}</Text> : null}

            {recentEntries.length ? (
              <View style={{ flexDirection: wideJournal ? "row" : "column", flexWrap: wideJournal ? "wrap" : "nowrap", gap: 12 }}>
                {recentEntries.map((entry: JournalEntry) => (
                  <View
                    key={entry.id}
                    style={{
                      flexBasis: wideJournal ? "48%" : "100%",
                      flexGrow: 1,
                      minWidth: wideJournal ? 240 : undefined
                    }}
                  >
                    <Card>
                      <Text selectable className="text-base leading-6 text-ink dark:text-white">
                        {entry.content}
                      </Text>
                      {entry.tags.length ? (
                        <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">{entry.tags.join(", ")}</Text>
                      ) : null}
                    </Card>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}
