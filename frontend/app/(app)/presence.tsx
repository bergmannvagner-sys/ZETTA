import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Badge, Button, Card } from "@/components/ui";
import { useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";

export default function Presence() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const widePresence = width >= 820;
  const orbSize = Math.min(300, Math.max(224, width * 0.56));
  const [phase, setPhase] = useState(0);
  const [isCalm, setIsCalm] = useState(false);
  const phases = [t("presence.phase1"), t("presence.phase2"), t("presence.phase3")];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((current) => (current + 1) % phases.length);
    }, 5200);
    return () => clearInterval(interval);
  }, [phases.length]);

  return (
    <Screen>
      <View
        style={{
          alignItems: "center",
          gap: 24,
          justifyContent: "center",
          minHeight: 620,
          paddingTop: 8,
          width: "100%"
        }}
      >
        <View style={{ alignItems: "center", gap: 18, maxWidth: widePresence ? 840 : 640, width: "100%" }}>
          <PageHero
            kicker={t("presence.kicker")}
            title={t("presence.title")}
            subtitle={t("presence.body")}
            orbOnPress={() => setIsCalm((current) => !current)}
            orbSize={orbSize}
            orbState={isCalm ? "calm" : "breathing"}
          />

          <Card>
            <View className="flex-row flex-wrap gap-2">
              <Badge label={t("presence.kicker")} tone="info" />
              <Badge label={t("home.presence")} tone="soft" />
              <Badge label={t("route.sos")} tone="warning" />
            </View>
            <Text className="text-base leading-7 text-muted dark:text-[#D1D5DB]">{t("presence.explainBody")}</Text>
            <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">{t("presence.continueBody")}</Text>
          </Card>

          <View style={{ alignItems: "center", gap: 10, width: "100%" }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "800", letterSpacing: 4 }}>
              {t("presence.active")}
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: width < 420 ? 20 : 22, fontWeight: "700", lineHeight: 28, textAlign: "center" }}>
              {phases[phase]}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22, maxWidth: 360, textAlign: "center" }}>
              {t("presence.tapHint")}
            </Text>
          </View>

          <View style={{ gap: 12, width: "100%", maxWidth: 360 }}>
            <Button
              label={t("home.care.checkin")}
              icon="checkmark-circle-outline"
              tone="soft"
              onPress={() => router.push("/(app)/quick-checkin" as never)}
            />
            <Button
              label={t("home.care.mood")}
              icon="heart-outline"
              tone="soft"
              onPress={() => router.push("/(app)/mood" as never)}
            />
            <Button
              label={t("home.care.thoughtDump")}
              icon="document-text-outline"
              tone="soft"
              onPress={() => router.push("/(app)/thought-dump" as never)}
            />
            <Button
              label={t("presence.chat")}
              tone="soft"
              icon="chatbubble-ellipses-outline"
              onPress={() => router.push({ pathname: "/(app)/chat", params: { mode: "silent_presence" } })}
            />
            <Button label="SOS" icon="warning-outline" tone="danger" onPress={() => router.push("/(app)/sos")} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
