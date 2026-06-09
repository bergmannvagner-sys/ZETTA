import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { QuietPanel } from "@/components/emotional";
import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { createJournalEntry } from "@/lib/emotional";

type OrganizedDump = {
  worries: string[];
  pending: string[];
  feelings: string[];
  ideas: string[];
};

function splitSentences(value: string) {
  return value
    .split(/\n|(?<=[.!?])\s+/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function organizeDump(value: string): OrganizedDump {
  const result: OrganizedDump = { worries: [], pending: [], feelings: [], ideas: [] };
  const sentences = splitSentences(value);
  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase();
    if (/preocup|medo|receio|e se|ansios/u.test(normalized)) {
      result.worries.push(sentence);
    } else if (/preciso|tenho que|devo|pendente|resolver|mandar|pagar|fazer/u.test(normalized)) {
      result.pending.push(sentence);
    } else if (/sinto|triste|raiva|cansad|irritad|culpa|sozinh|feliz|calmo/u.test(normalized)) {
      result.feelings.push(sentence);
    } else {
      result.ideas.push(sentence);
    }
  }
  return result;
}

function DumpSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <QuietPanel>
      <Text className="text-base font-semibold text-ink dark:text-white">{title}</Text>
      {items.length ? (
        items.map((item) => (
          <Text key={item} selectable className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">- {item}</Text>
        ))
      ) : (
        <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">{empty}</Text>
      )}
    </QuietPanel>
  );
}

export default function ThoughtDump() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const organized = useMemo(() => organizeDump(content), [content]);
  const hasContent = content.trim().length >= 2;
  const wideDump = width >= 860;
  const orbSize = wideDump ? Math.min(248, Math.max(188, width * 0.3)) : Math.min(214, Math.max(168, width * 0.56));
  const mutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    }
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <PageHero
          kicker={t("thoughtDump.kicker")}
          title={t("thoughtDump.title")}
          subtitle={t("thoughtDump.subtitle")}
          orbSize={orbSize}
          orbState="thinking"
        />

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          <Field
            label={t("thoughtDump.prompt")}
            value={content}
            onChangeText={(value) => {
              setSaved(false);
              setContent(value);
            }}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={6000}
          />

          {saved ? (
            <QuietPanel>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("thoughtDump.saved")}</Text>
            </QuietPanel>
          ) : null}

          <ErrorText message={mutation.error?.message} />

          <Button
            label={t("thoughtDump.save")}
            disabled={!hasContent}
            loading={mutation.isPending}
            onPress={() =>
              mutation.mutate({
                content: content.trim(),
                entry_type: "THOUGHT_DUMP",
                tags: ["thought_dump"]
              })
            }
          />

          {wideDump ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <View style={{ flexBasis: "48%", flexGrow: 1, minWidth: 240 }}>
                <DumpSection title={t("thoughtDump.worries")} items={organized.worries} empty={t("thoughtDump.empty")} />
              </View>
              <View style={{ flexBasis: "48%", flexGrow: 1, minWidth: 240 }}>
                <DumpSection title={t("thoughtDump.pending")} items={organized.pending} empty={t("thoughtDump.empty")} />
              </View>
              <View style={{ flexBasis: "48%", flexGrow: 1, minWidth: 240 }}>
                <DumpSection title={t("thoughtDump.feelings")} items={organized.feelings} empty={t("thoughtDump.empty")} />
              </View>
              <View style={{ flexBasis: "48%", flexGrow: 1, minWidth: 240 }}>
                <DumpSection title={t("thoughtDump.ideas")} items={organized.ideas} empty={t("thoughtDump.empty")} />
              </View>
            </View>
          ) : hasContent ? (
            <View className="gap-3">
              <DumpSection title={t("thoughtDump.worries")} items={organized.worries} empty={t("thoughtDump.empty")} />
              <DumpSection title={t("thoughtDump.pending")} items={organized.pending} empty={t("thoughtDump.empty")} />
              <DumpSection title={t("thoughtDump.feelings")} items={organized.feelings} empty={t("thoughtDump.empty")} />
              <DumpSection title={t("thoughtDump.ideas")} items={organized.ideas} empty={t("thoughtDump.empty")} />
            </View>
          ) : (
            <QuietPanel>
              <Text className="text-base font-semibold text-ink dark:text-white">{t("thoughtDump.prompt")}</Text>
              <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">{t("thoughtDump.empty")}</Text>
            </QuietPanel>
          )}
        </View>
      </View>
    </Screen>
  );
}
