import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { AuthGate } from "@/components/auth-gate";
import { PageHero } from "@/components/page-hero";
import { useAppTheme, useResponsiveLayout, radii } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { joinTelecareSession } from "@/lib/telecare";
import { useAuthStore } from "@/store/auth-store";
import { Badge, Card, ErrorText } from "@/components/ui";

export default function TelecareRoom() {
  const { colors } = useAppTheme();
  const { contentMaxWidth, horizontalPadding } = useResponsiveLayout();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const wideRoom = width >= 840;
  const orbSize = wideRoom ? Math.min(246, Math.max(188, width * 0.23)) : Math.min(222, Math.max(176, width * 0.56));

  const join = useQuery({
    queryKey: ["telecare-join", sessionId],
    queryFn: () => joinTelecareSession(sessionId),
    enabled: hydrated && Boolean(sessionId) && Boolean(accessToken),
    retry: false
  });

  const videoHeight = Math.max(wideRoom ? 520 : 480, height - insets.top - insets.bottom - (wideRoom ? 170 : 190));
  const roomPanelMinHeight = accessToken ? videoHeight : wideRoom ? 360 : 320;
  const roomSubtitle = !hydrated
    ? t("common.loading")
    : !accessToken
      ? t("telecare.roomAuthBody")
      : join.data
        ? t("telecare.roomScreenSubtitle", { room: join.data.room_code })
        : t("telecare.roomScreenPreparing");

  const orbState = !hydrated ? "breathing" : !accessToken ? "calm" : join.error ? "error" : join.data ? "listening" : "thinking";

  const infoStack = (
    <View style={{ gap: 18, width: "100%" }}>
      <Card>
        <Text className="text-lg font-semibold text-ink dark:text-white">{t("telecare.privacyTitle")}</Text>
        <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">{t("telecare.privacyBody")}</Text>
      </Card>

      <Card>
        <Text className="text-lg font-semibold text-ink dark:text-white">{t("telecare.platformTitle")}</Text>
        <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">{t("telecare.platformBody")}</Text>
      </Card>

      {join.data ? (
        <Card>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-lg font-semibold text-ink dark:text-white">{t("telecare.roomScreenTitle")}</Text>
            <Badge label={join.data.video_engine} tone="info" />
          </View>
          <Text className="text-sm leading-6 text-muted dark:text-[#D1D5DB]">
            {t("telecare.roomCode", { code: join.data.room_code })}
          </Text>
        </Card>
      ) : null}
    </View>
  );

  const roomPanel = (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderCurve: "continuous",
        borderRadius: radii.lg,
        borderWidth: 1,
        minHeight: roomPanelMinHeight,
        overflow: "hidden"
      }}
    >
      {!hydrated ? (
        <View style={{ alignItems: "center", flex: 1, gap: 12, justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t("common.loading")}</Text>
        </View>
      ) : !accessToken ? (
        <View style={{ flex: 1, justifyContent: "center", padding: 22 }}>
          <AuthGate
            title={t("telecare.roomAuthTitle")}
            body={t("telecare.roomAuthBody")}
            resourceLabel={t("telecare.roomScreenTitle")}
          />
        </View>
      ) : join.isLoading ? (
        <View style={{ alignItems: "center", flex: 1, gap: 12, justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t("telecare.joiningDaily")}</Text>
        </View>
      ) : join.error ? (
        <View style={{ flex: 1, justifyContent: "center", padding: 22 }}>
          <ErrorText message={join.error.message} />
        </View>
      ) : join.data ? (
        <WebView
          source={{ uri: join.data.join_url }}
          allowsInlineMediaPlayback
          domStorageEnabled
          javaScriptEnabled
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={["https://*"]}
          startInLoadingState
          style={{ backgroundColor: colors.surface, flex: 1 }}
          renderLoading={() => (
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", padding: 22 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 23 }}>{t("telecare.missingSession")}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom", "top"]} style={{ backgroundColor: colors.background, flex: 1 }}>
      <View
        style={{
          alignSelf: "center",
          alignItems: "center",
          flex: 1,
          gap: 24,
          maxWidth: contentMaxWidth,
          paddingBottom: Math.max(insets.bottom + 16, 24),
          paddingHorizontal: horizontalPadding,
          paddingTop: Math.max(insets.top + 12, 20),
          width: "100%"
        }}
      >
        <PageHero
          kicker={t("telecare.kicker")}
          title={t("telecare.roomScreenTitle")}
          subtitle={roomSubtitle}
          orbSize={orbSize}
          orbState={orbState}
          maxWidth={640}
        />

        <View style={{ gap: 18, width: "100%" }}>
          {roomPanel}
          {infoStack}
        </View>
      </View>
    </SafeAreaView>
  );
}
