import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, Platform, Text, useWindowDimensions, View } from "react-native";

import { PageHero } from "@/components/page-hero";
import { Screen } from "@/components/screen";
import { SupportMap } from "@/components/support-map";
import { Button, Card, ErrorText } from "@/components/ui";
import { useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { registerSOSEvent, SOS_OFFLINE_MESSAGE } from "@/lib/sos";

type SOSOption = "talk" | "breathe" | "silence" | "help" | null;

type SupportSearchContext = {
  hasLocation: boolean;
  latitude: number;
  longitude: number;
};

function mapsSearchUrl(query: string, context?: SupportSearchContext) {
  const queryWithLocation = context?.hasLocation
    ? `${query.replace(/ perto de mim$/iu, "")} ${context.latitude.toFixed(6)},${context.longitude.toFixed(6)}`
    : query;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryWithLocation)}`;
}

export default function SOS() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const wideSOS = width >= 820;
  const [option, setOption] = useState<SOSOption>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const orbSize = wideSOS ? Math.min(216, Math.max(176, width * 0.34)) : Math.min(188, Math.max(176, width * 0.46));
  const mutation = useMutation({
    mutationFn: registerSOSEvent,
    onSuccess: (data) => {
      setRegistered(true);
      setMessage(data.safety_message);
    },
    onError: () => setMessage(SOS_OFFLINE_MESSAGE)
  });
  const orbState =
    mutation.isError
      ? "error"
      : option === "breathe"
        ? "breathing"
        : option === "silence"
          ? "silent_presence"
        : option === "talk"
          ? "listening"
          : "sos";
  const orbAccent =
    orbState === "error"
      ? colors.error
      : orbState === "sos"
        ? colors.warning
      : orbState === "listening"
        ? colors.info
        : colors.primaryDark;

  async function openMapSearch(query: string, context?: SupportSearchContext) {
    const url = mapsSearchUrl(query, context);
    setMapError(null);
    try {
      if (Platform.OS === "web") {
        const opened = typeof window !== "undefined" ? window.open(url, "_blank", "noopener,noreferrer") : null;
        if (!opened) {
          setMapError(t("sos.mapErrorGeneric"));
        }
        return;
      }
      await Linking.openURL(url);
    } catch {
      setMapError(t("sos.mapErrorGeneric"));
    }
  }

  async function openCvv() {
    try {
      await Linking.openURL("tel:188");
    } catch {
      router.push("/(app)/cannot-think" as never);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <PageHero
          kicker="SOS"
          title={t("sos.title")}
          subtitle={t("sos.guidance")}
          accent={orbAccent}
          orbReducedMotion={mutation.isPending}
          orbSize={orbSize}
          orbState={orbState}
        />

        <View style={{ gap: 18, maxWidth: 960, width: "100%" }}>
          <Card>
            <View className="gap-3">
              <Text className="text-lg font-semibold text-ink dark:text-white">{t("sos.choiceTitle")}</Text>
              <View style={{ gap: 12 }}>
                <Button
                  label={t("sos.choiceTalk")}
                  icon="chatbubble-ellipses-outline"
                  tone={option === "talk" ? "primary" : "soft"}
                  onPress={() => setOption("talk")}
                />
                <Button
                  label={t("sos.choiceBreathe")}
                  icon="leaf-outline"
                  tone={option === "breathe" ? "primary" : "soft"}
                  onPress={() => setOption("breathe")}
                />
                <Button
                  label={t("sos.choiceSilence")}
                  icon="moon-outline"
                  tone={option === "silence" ? "primary" : "soft"}
                  onPress={() => setOption("silence")}
                />
                <Button label={t("sos.choiceHelp")} icon="warning-outline" tone="danger" onPress={() => setOption("help")} />
              </View>
            </View>
          </Card>

          {option === "talk" ? (
            <Card>
              <Text className="text-base leading-6 text-ink dark:text-white">{t("sos.talkBody")}</Text>
              <Button
                label={t("sos.talkButton")}
                icon="chatbubble-ellipses-outline"
                onPress={() => router.push({ pathname: "/(app)/chat", params: { mode: "crisis" } })}
              />
            </Card>
          ) : null}
          {option === "breathe" ? (
            <Card>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("sos.breatheBody")}</Text>
            </Card>
          ) : null}
          {option === "silence" ? (
            <Card>
              <Text className="text-base leading-7 text-ink dark:text-white">{t("sos.silenceBody")}</Text>
            </Card>
          ) : null}
          {option === "help" ? (
            <View className="gap-3">
              <Button label={t("sos.call188")} icon="call-outline" tone="danger" onPress={() => void openCvv()} />
              {!confirmed ? (
                <Button label={t("sos.confirm")} icon="warning-outline" tone="danger" onPress={() => setConfirmed(true)} />
              ) : (
                <View className="gap-3">
                  <Button
                    label={registered ? t("sos.registered") : t("sos.register")}
                    icon="checkmark-circle-outline"
                    tone="danger"
                    loading={mutation.isPending}
                    disabled={registered}
                    onPress={() => mutation.mutate()}
                  />
                  <Button
                    label={registered ? t("common.back") : t("common.cancel")}
                    icon={registered ? "arrow-back-outline" : "close-outline"}
                    tone="soft"
                    onPress={() => {
                      setConfirmed(false);
                      setRegistered(false);
                      setMessage(null);
                    }}
                  />
                </View>
              )}
            </View>
          ) : null}
          <ErrorText message={mutation.error?.message} />
          {message ? (
            <Card>
              <Text selectable className="text-base leading-6 text-ink dark:text-white">
                {message}
              </Text>
            </Card>
          ) : null}

          <SupportMap onOpenSearch={openMapSearch} />
          <ErrorText message={mapError ?? undefined} />
        </View>
      </View>
    </Screen>
  );
}
