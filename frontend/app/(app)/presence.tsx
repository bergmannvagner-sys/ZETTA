import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui";
import { useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";

export default function Presence() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
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
        <View style={{ alignItems: "center", gap: 18, maxWidth: 640, width: "100%" }}>
          <PageHero
            kicker={t("presence.kicker")}
            title={t("presence.title")}
            subtitle={t("presence.body")}
            orbOnPress={() => setIsCalm((current) => !current)}
            orbSize={orbSize}
            orbState={isCalm ? "calm" : "breathing"}
          />

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
              label={t("presence.chat")}
              tone="soft"
              onPress={() => router.push({ pathname: "/(app)/chat", params: { mode: "silent_presence" } })}
            />
            <Button label="SOS" tone="danger" onPress={() => router.push("/(app)/sos")} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
