import { router } from "expo-router";
import { Linking } from "react-native";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";

type SafetyAnswer = "yes" | "no" | null;

export default function CannotThink() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [safe, setSafe] = useState<SafetyAnswer>(null);
  const wideCannotThink = width >= 840;
  const orbSize = Math.min(228, Math.max(184, width * 0.5));

  async function openCvv() {
    try {
      await Linking.openURL("tel:188");
    } catch {
      router.push("/(app)/sos" as never);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <PageHero
          kicker={t("cannotThink.kicker")}
          title={t("cannotThink.title")}
          subtitle={t("cannotThink.subtitle")}
          orbSize={orbSize}
          orbState={safe === "no" ? "sos" : safe === "yes" ? "calm" : "low_energy"}
        />

        <View style={{ gap: 18, maxWidth: wideCannotThink ? 860 : 760, width: "100%" }}>
          <Card>
            <View className="flex-row flex-wrap gap-2">
              <Badge label={t("cannotThink.kicker")} tone="info" />
              <Badge label={t("home.care.cannotThink")} tone="warning" />
              <Badge label={t("route.sos")} tone="soft" />
            </View>
            <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("cannotThink.explainBody")}</Text>
          </Card>

          <Card>
            <Text className="text-xl font-semibold leading-8 text-ink dark:text-white">{t("cannotThink.safeQuestion")}</Text>
            <View className="gap-3 pt-2">
              <Button label={t("cannotThink.safeYes")} icon="checkmark-outline" onPress={() => setSafe("yes")} />
              <Button label={t("cannotThink.safeNo")} icon="close-outline" tone="danger" onPress={() => setSafe("no")} />
            </View>
          </Card>
          {safe === "yes" ? (
            <Card>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("cannotThink.yesBody")}</Text>
              <Button
                label={t("cannotThink.dump")}
                icon="document-text-outline"
                tone="soft"
                onPress={() => router.push("/(app)/thought-dump" as never)}
              />
              <Button label={t("cannotThink.chat")} icon="chatbubble-ellipses-outline" onPress={() => router.push("/(app)/chat" as never)} />
              <Button label={t("home.presence")} icon="moon-outline" tone="soft" onPress={() => router.push("/(app)/presence" as never)} />
            </Card>
          ) : null}
          {safe === "no" ? (
            <Card>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("cannotThink.noBody")}</Text>
              <Button label={t("cannotThink.call188")} icon="call-outline" tone="danger" onPress={() => void openCvv()} />
              <Button label={t("cannotThink.sos")} icon="warning-outline" tone="danger" onPress={() => router.push("/(app)/sos" as never)} />
              <Button label={t("home.presence")} icon="moon-outline" tone="soft" onPress={() => router.push("/(app)/presence" as never)} />
            </Card>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
