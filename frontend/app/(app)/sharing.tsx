import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field, SectionTitle } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import {
  createSharingConsent,
  listSharingConsents,
  revokeSharingConsent,
  searchConnectionTarget,
  ConnectionSearchResult,
  SharingConsent,
  SharingCategory
} from "@/lib/emotional";

const categoryLabels: Array<{ value: SharingCategory; labelKey: string; helperKey: string }> = [
  { value: "AI_SUMMARY", labelKey: "sharing.summary", helperKey: "sharing.summaryHelper" },
  { value: "TRENDS", labelKey: "sharing.trends", helperKey: "sharing.trendsHelper" },
  { value: "MOOD", labelKey: "route.mood", helperKey: "sharing.moodHelper" },
  { value: "CRISIS", labelKey: "sharing.crisis", helperKey: "sharing.crisisHelper" },
  { value: "JOURNAL", labelKey: "sharing.journal", helperKey: "sharing.journalHelper" }
];

function toggleCategory(current: SharingCategory[], category: SharingCategory): SharingCategory[] {
  if (current.includes(category)) {
    return current.filter((item) => item !== category);
  }
  return [...current, category];
}

export default function Sharing() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [targetIdentifier, setTargetIdentifier] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<ConnectionSearchResult | null>(null);
  const [categories, setCategories] = useState<SharingCategory[]>(["AI_SUMMARY", "TRENDS"]);
  const [summaryOnly, setSummaryOnly] = useState(true);
  const consents = useQuery({ queryKey: ["sharing-consents"], queryFn: listSharingConsents });
  const search = useMutation({
    mutationFn: searchConnectionTarget,
    onSuccess: (target) => setSelectedTarget(target)
  });
  const grant = useMutation({
    mutationFn: createSharingConsent,
    onSuccess: async () => {
      setTargetIdentifier("");
      setSelectedTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["sharing-consents"] });
    }
  });
  const revoke = useMutation({
    mutationFn: revokeSharingConsent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sharing-consents"] });
    }
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24 }}>
        <PageHero
          kicker={t("sharing.kicker")}
          title={t("sharing.title")}
          subtitle={t("sharing.subtitle")}
          orbState="silent_presence"
        />

        <View style={{ width: "100%", maxWidth: 760, gap: 14 }}>
          <Button
            label={t("sharing.myLinks")}
            tone="soft"
            onPress={() => router.push("/(app)/my-connections" as never)}
          />

          <Card>
            <View className="gap-3">
              <Text className="text-base font-semibold text-ink dark:text-white">{t("sharing.search")}</Text>
              <Field
                label={t("sharing.identifier")}
                value={targetIdentifier}
                onChangeText={(value) => {
                  setTargetIdentifier(value);
                  setSelectedTarget(null);
                }}
                keyboardType="email-address"
                maxLength={320}
              />
              <ErrorText message={search.error?.message} />
              <Button
                label={t("sharing.search")}
                tone="soft"
                loading={search.isPending}
                disabled={targetIdentifier.trim().length < 3}
                onPress={() => search.mutate(targetIdentifier.trim())}
              />
            </View>
          </Card>

          {selectedTarget ? (
            <Card>
              <Text selectable className="text-base font-semibold text-ink dark:text-white">{selectedTarget.full_name}</Text>
              <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">{selectedTarget.email}</Text>
              <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                {t("profile.role", { value: selectedTarget.role })}
              </Text>
              <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                {t("sharing.code", { value: selectedTarget.connection_code })}
              </Text>
            </Card>
          ) : null}

          <Card>
            <View className="gap-3">
              <Text className="text-base font-semibold text-ink dark:text-white">{t("sharing.categories")}</Text>
              <View className="gap-3">
                {categoryLabels.map((item) => {
                  const active = categories.includes(item.value);
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      onPress={() => setCategories((current) => toggleCategory(current, item.value))}
                      className={`rounded-xl border p-4 ${
                        active
                          ? "border-primary/50 bg-primary/10"
                          : "border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55"
                      }`}
                    >
                      <Text className="text-base font-semibold text-ink dark:text-white">{t(item.labelKey)}</Text>
                      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{t(item.helperKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          <Card>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: summaryOnly }}
              onPress={() => setSummaryOnly((current) => !current)}
              className="rounded-xl border border-primaryLight dark:border-[#4C1D95]/40 bg-surface dark:bg-[#1C1630]/55 p-4"
            >
              <Text className="text-base font-semibold text-ink dark:text-white">
                {summaryOnly ? t("sharing.summaryOnly") : t("sharing.details")}
              </Text>
              <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{t("sharing.recommendation")}</Text>
            </Pressable>
          </Card>

          <Card>
            <View className="gap-3">
              <ErrorText message={grant.error?.message} />
              <Button
                label={t("sharing.authorize")}
                loading={grant.isPending}
                disabled={!selectedTarget || categories.length === 0}
                onPress={() =>
                  selectedTarget
                    ? grant.mutate({
                        target_identifier: selectedTarget.connection_code || selectedTarget.email,
                        categories,
                        summary_only: summaryOnly
                      })
                    : undefined
                }
              />
            </View>
          </Card>

          <View className="gap-3">
            <SectionTitle align="center" title={t("sharing.recent")} />
            {consents.isLoading ? <Text className="text-muted dark:text-[#D1D5DB]">{t("common.loading")}</Text> : null}
            <ErrorText message={consents.error?.message ?? revoke.error?.message} />
            {consents.data?.map((consent: SharingConsent) => (
              <Card key={consent.id}>
                <Text selectable className="text-base font-semibold text-ink dark:text-white">
                  {consent.target_email}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  {t("profile.role", { value: consent.target_role })}
                </Text>
                <Text selectable className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">
                  {t("sharing.categoriesValue", { value: consent.categories.join(", ") })}
                </Text>
                <Text selectable className="text-sm text-muted dark:text-[#D1D5DB]">
                  {t("sharing.status", { value: consent.revoked_at ? t("sharing.revoked") : t("sharing.active") })}
                </Text>
                {!consent.revoked_at ? (
                  <Button
                    label={t("sharing.revoke")}
                    tone="soft"
                    loading={revoke.isPending}
                    onPress={() => revoke.mutate(consent.id)}
                  />
                ) : null}
              </Card>
            ))}
            {consents.data?.length === 0 ? <Text className="text-muted dark:text-[#D1D5DB]">{t("sharing.empty")}</Text> : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}
