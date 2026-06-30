import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Platform, Text, useWindowDimensions, View } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field, Header } from "@/components/ui";
import { ZettaMindPanel } from "@/components/zetta-metrics";
import { useI18n } from "@/i18n/i18n";
import {
  createJournalEntry,
  deleteJournalEntry,
  JournalEntry,
  listJournalEntries,
  updateJournalEntry
} from "@/lib/emotional";
import { buildZettaMindSnapshot } from "@/lib/zetta-intelligence";
import { useState } from "react";

function tagList(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export default function Journal() {
  const { language, t } = useI18n();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const entries = useQuery({ queryKey: ["journal-entries"], queryFn: listJournalEntries });

  async function invalidateJournalCaches() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["home-journal-entries"] })
    ]);
  }

  const createMutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: async () => {
      setContent("");
      setTags("");
      await invalidateJournalCaches();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: { content: string; tags: string[] } }) =>
      updateJournalEntry(entryId, input),
    onSuccess: async () => {
      setContent("");
      setTags("");
      setEditingEntryId(null);
      await invalidateJournalCaches();
    }
  });
  const deleteMutation = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: async (_, entryId) => {
      if (editingEntryId === entryId) {
        setContent("");
        setTags("");
        setEditingEntryId(null);
      }
      await invalidateJournalCaches();
    }
  });

  const wideJournal = width >= 860;
  const orbSize = wideJournal ? Math.min(248, Math.max(188, width * 0.3)) : Math.min(180, Math.max(168, width * 0.52));
  const recentEntries = entries.data?.slice(0, 3) ?? [];
  const mindSnapshot = buildZettaMindSnapshot([], entries.data ?? []);
  const isEditing = editingEntryId !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function startEditing(entry: JournalEntry) {
    setEditingEntryId(entry.id);
    setContent(entry.content);
    setTags(entry.tags.join(", "));
  }

  function cancelEditing() {
    setEditingEntryId(null);
    setContent("");
    setTags("");
  }

  function confirmDelete(entry: JournalEntry) {
    const message = t("journal.deleteConfirmMessage");
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && !window.confirm(message)) {
        return;
      }
      deleteMutation.mutate(entry.id);
      return;
    }
    Alert.alert(t("journal.deleteConfirmTitle"), message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("journal.delete"),
        style: "destructive",
        onPress: () => deleteMutation.mutate(entry.id)
      }
    ]);
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: width < 420 ? 18 : 24, width: "100%" }}>
        <View style={{ alignItems: "center", gap: width < 420 ? 12 : 14, maxWidth: 640, width: "100%" }}>
          <AnimatedOrb state="journaling" size={orbSize} />
          <Header align="center" kicker={t("journal.kicker")} title={t("journal.title")} subtitle={t("journal.subtitle")} />
        </View>

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          <ZettaMindPanel snapshot={mindSnapshot} />

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

          {isEditing ? (
            <Card>
              <Text className="text-sm font-semibold text-primaryDark">{t("journal.editingTitle")}</Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                {t("journal.editingBody")}
              </Text>
              <Button label={t("common.cancel")} tone="soft" onPress={cancelEditing} />
            </Card>
          ) : null}

          <ErrorText message={createMutation.error?.message ?? updateMutation.error?.message ?? deleteMutation.error?.message} />

          <Button
            label={editingEntryId ? t("common.save") : t("journal.save")}
            loading={isSaving}
            onPress={() => {
              const payload = { content: content.trim(), tags: tagList(tags) };
              if (editingEntryId) {
                updateMutation.mutate({ entryId: editingEntryId, input: payload });
                return;
              }
              createMutation.mutate(payload);
            }}
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
                      <View className="gap-1">
                        <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                          {entry.entry_type}
                        </Text>
                        <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">
                          {new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(
                            new Date(entry.created_at)
                          )}
                        </Text>
                      </View>
                      <Text selectable className="text-base leading-6 text-ink dark:text-white">
                        {entry.content}
                      </Text>
                      {entry.tags.length ? (
                        <Text selectable className="text-xs text-muted dark:text-[#D1D5DB]">{entry.tags.join(", ")}</Text>
                      ) : null}
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Button label={t("journal.edit")} tone="soft" compact onPress={() => startEditing(entry)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label={t("journal.delete")}
                            tone="danger"
                            compact
                            loading={deleteMutation.isPending && deleteMutation.variables === entry.id}
                            onPress={() => confirmDelete(entry)}
                          />
                        </View>
                      </View>
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
