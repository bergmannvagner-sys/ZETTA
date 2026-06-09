import { router } from "expo-router";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";

type SafetyAnswer = "yes" | "no" | null;

export default function CannotThink() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [safe, setSafe] = useState<SafetyAnswer>(null);
  const wideCannotThink = width >= 840;
  const orbSize = Math.min(228, Math.max(184, width * 0.5));

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <PageHero
          kicker={t("cannotThink.kicker")}
          title={t("cannotThink.title")}
          subtitle={t("cannotThink.subtitle")}
          orbSize={orbSize}
          orbState={safe === "no" ? "sos" : "low_energy"}
        />
        <View style={{ gap: 18, maxWidth: 760, width: "100%" }}>
          <Card>
            <Text className="text-xl font-semibold leading-8 text-ink dark:text-white">{t("cannotThink.safeQuestion")}</Text>
            <View className="gap-3 pt-2">
              <Button label={t("cannotThink.safeYes")} onPress={() => setSafe("yes")} />
              <Button label={t("cannotThink.safeNo")} tone="danger" onPress={() => setSafe("no")} />
            </View>
          </Card>
          {safe === "yes" ? (
            <Card>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("cannotThink.yesBody")}</Text>
              <Button label={t("cannotThink.dump")} tone="soft" onPress={() => router.push("/(app)/thought-dump" as never)} />
              <Button label={t("cannotThink.chat")} onPress={() => router.push("/(app)/chat" as never)} />
            </Card>
          ) : null}
          {safe === "no" ? (
            <Card>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("cannotThink.noBody")}</Text>
              <Button label={t("cannotThink.sos")} tone="danger" onPress={() => router.push("/(app)/sos" as never)} />
            </Card>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
