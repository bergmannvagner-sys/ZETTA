import { router } from "expo-router";
import { Text, View } from "react-native";

import { useResponsiveLayout } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";

import { Button } from "./ui";

type AuthGateProps = {
  title: string;
  body: string;
  resourceLabel?: string;
};

export function AuthGate({ title, body, resourceLabel }: AuthGateProps) {
  const { t } = useI18n();
  const { isMobile } = useResponsiveLayout();

  return (
    <View style={{ gap: 16 }}>
      <View className="gap-1">
        <Text className="text-xs font-semibold text-primary">{t("auth.gate.kicker")}</Text>
        <Text className="text-xl font-semibold text-ink dark:text-white">{title}</Text>
      </View>

      <View style={{ flexDirection: isMobile ? "column" : "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="auth.login.submit" icon="log-in-outline" onPress={() => router.push("/(auth)/login" as never)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="auth.login.create"
            icon="person-add-outline"
            tone="soft"
            onPress={() => router.push("/(auth)/select-role" as never)}
          />
        </View>
      </View>

      <Text className="text-sm leading-5 text-muted dark:text-[#D1D5DB]">{body}</Text>

      {resourceLabel ? (
        <View className="gap-1 rounded-2xl border border-primaryLight/70 dark:border-[#4C1D95]/40 bg-surfaceSoft dark:bg-[#261D42]/35 p-3">
          <Text className="text-xs text-muted dark:text-[#D1D5DB]">{t("auth.gate.resource")}</Text>
          <Text className="text-sm font-semibold text-ink dark:text-white">{resourceLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
