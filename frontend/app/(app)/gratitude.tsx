import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { createJournalEntry } from "@/lib/emotional";

export default function Gratitude() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const mutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: async () => {
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    }
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker={t("gratitude.kicker")}
          title={t("gratitude.title")}
          subtitle={t("gratitude.subtitle")}
          orbState="calm"
        />

        <View style={{ width: "100%", maxWidth: 640, gap: 16 }}>
          <Field
            label={t("gratitude.prompt")}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1200}
          />
          {mutation.data ? (
            <View className="gap-3 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/10 bg-surface dark:bg-[#1C1630]/50 p-5">
              <Text className="text-base leading-7 text-ink dark:text-white">{t("gratitude.saved")}</Text>
            </View>
          ) : null}
          <ErrorText message={mutation.error?.message} />
          <Button
            label={t("gratitude.submit")}
            disabled={content.trim().length < 2}
            loading={mutation.isPending}
            onPress={() =>
              mutation.mutate({
                content: content.trim(),
                entry_type: "GRATITUDE",
                tags: ["gratidao"]
              })
            }
          />
        </View>
      </View>
    </Screen>
  );
}
