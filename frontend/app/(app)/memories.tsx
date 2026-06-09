import * as SecureStore from "expo-secure-store";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Platform, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { QuietPanel } from "@/components/emotional";
import { Screen } from "@/components/screen";
import { Button, ErrorText } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { listCareReminders } from "@/lib/assistant";
import { listJournalEntries, listSharingConsents } from "@/lib/emotional";
import { getWebStorage } from "@/lib/web-storage";
import { useAuthStore } from "@/store/auth-store";

type MemoryItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
};

const MEMORY_HIDDEN_KEY = "bergmann_hidden_memories";
const hiddenMemoryStorage = getWebStorage("local");

async function readHiddenMemoryIds(): Promise<string[]> {
  const raw =
    Platform.OS === "web" && typeof window !== "undefined"
      ? hiddenMemoryStorage.getItem(MEMORY_HIDDEN_KEY)
      : await SecureStore.getItemAsync(MEMORY_HIDDEN_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function saveHiddenMemoryIds(ids: string[]): Promise<void> {
  const raw = JSON.stringify(ids);
  if (Platform.OS === "web" && typeof window !== "undefined") {
    hiddenMemoryStorage.setItem(MEMORY_HIDDEN_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(MEMORY_HIDDEN_KEY, raw);
}

function buildMemories({
  fullName,
  reminders,
  consents,
  entries,
  t
}: {
  fullName?: string;
  reminders: Awaited<ReturnType<typeof listCareReminders>>;
  consents: Awaited<ReturnType<typeof listSharingConsents>>;
  entries: Awaited<ReturnType<typeof listJournalEntries>>;
  t: (key: string, params?: Record<string, string | number>) => string;
}): MemoryItem[] {
  const items: MemoryItem[] = [];
  if (fullName) {
    items.push({
      id: "profile:name",
      title: t("memories.item.name"),
      detail: fullName,
      source: t("memories.source.profile")
    });
  }
  if (reminders.length) {
    items.push({
      id: "routine:active",
      title: t("memories.item.routine"),
      detail: t("memories.item.routineDetail", { count: reminders.length }),
      source: t("memories.source.routine")
    });
  }
  if (consents.some((consent) => !consent.revoked_at)) {
    items.push({
      id: "sharing:active",
      title: t("memories.item.sharing"),
      detail: t("memories.item.sharingDetail"),
      source: t("memories.source.sharing")
    });
  }
  const latestPositive = entries.find(
    (entry) =>
      entry.tags.some((tag) => tag.includes("grat")) ||
      /consegui|vit[oó]ria|bom|boa|feliz|melhor|orgulho|calma/iu.test(entry.content)
  );
  if (latestPositive) {
    items.push({
      id: `journal:${latestPositive.id}`,
      title: t("memories.item.positive"),
      detail: latestPositive.content.slice(0, 160),
      source: t("memories.source.journal")
    });
  }
  if (entries.length) {
    items.push({
      id: "journal:authorized",
      title: t("memories.item.journal"),
      detail: t("memories.item.journalDetail", { count: entries.length }),
      source: t("memories.source.journal")
    });
  }
  return items;
}

export default function Memories() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const reminders = useQuery({ queryKey: ["care-reminders"], queryFn: listCareReminders });
  const consents = useQuery({ queryKey: ["sharing-consents"], queryFn: listSharingConsents });
  const entries = useQuery({ queryKey: ["journal-entries"], queryFn: listJournalEntries });

  useEffect(() => {
    void readHiddenMemoryIds().then(setHiddenIds);
  }, []);

  const visibleMemories = useMemo(() => {
    const all = buildMemories({
      fullName: user?.full_name,
      reminders: reminders.data ?? [],
      consents: consents.data ?? [],
      entries: entries.data ?? [],
      t
    });
    return all.filter((item) => !hiddenIds.includes(item.id));
  }, [consents.data, entries.data, hiddenIds, reminders.data, t, user?.full_name]);

  async function hideMemory(id: string) {
    const next = Array.from(new Set([...hiddenIds, id]));
    setHiddenIds(next);
    await saveHiddenMemoryIds(next);
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker={t("memories.kicker")}
          title={t("memories.title")}
          subtitle={t("memories.subtitle")}
          orbState="silent_presence"
        />

        <View style={{ width: "100%", maxWidth: 960, gap: 16 }}>
          {reminders.isLoading || consents.isLoading || entries.isLoading ? (
            <Text className="text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text>
          ) : null}
          <ErrorText message={reminders.error?.message || consents.error?.message || entries.error?.message} />
          <QuietPanel>
            <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("memories.transparency")}</Text>
          </QuietPanel>
          {visibleMemories.length ? (
            <View className="gap-3">
              {visibleMemories.map((item) => (
                <QuietPanel key={item.id}>
                  <Text className="text-base font-semibold text-ink dark:text-white">{item.title}</Text>
                  <Text selectable className="text-base leading-7 text-muted dark:text-[#D1D5DB]">
                    {item.detail}
                  </Text>
                  <Text className="text-xs text-primaryDark">{item.source}</Text>
                  <Button label={t("memories.forget")} tone="soft" onPress={() => void hideMemory(item.id)} />
                </QuietPanel>
              ))}
            </View>
          ) : (
            <QuietPanel>
              <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("memories.empty")}</Text>
            </QuietPanel>
          )}
        </View>
      </View>
    </Screen>
  );
}
