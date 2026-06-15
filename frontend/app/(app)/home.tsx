import { router } from "expo-router";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { shadowStyle } from "@/design-system/shadows";
import { useAppTheme, useResponsiveLayout, radii } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import {
  hasPaidAccess,
  isPaidRole,
  paidAccessActionLabel,
  paidAccessBlockMessage,
  paidAccessBlockTitle
} from "@/lib/billing";
import { useAuthStore } from "@/store/auth-store";

type AppRoute =
  | "/(app)/chat"
  | "/(app)/mood"
  | "/(app)/journal"
  | "/(app)/routine"
  | "/(app)/cannot-think"
  | "/(app)/thought-dump"
  | "/(app)/gratitude"
  | "/(app)/positive-memories"
  | "/(app)/memories"
  | "/(app)/emotional-timeline"
  | "/(app)/emotional-report"
  | "/(app)/sharing"
  | "/(app)/telecare"
  | "/(app)/sos"
  | "/(app)/plans"
  | "/(app)/professional-users"
  | "/(app)/nr1"
  | "/(app)/institution-dashboard";

const INSTITUTION_ROLES = new Set(["CLINIC", "HOSPITAL", "NGO", "PUBLIC_INSTITUTION"]);
const ROUTE_ICONS: Partial<Record<AppRoute, keyof typeof Ionicons.glyphMap>> = {
  "/(app)/journal": "book-outline",
  "/(app)/routine": "calendar-outline",
  "/(app)/emotional-report": "analytics-outline",
  "/(app)/sharing": "share-social-outline",
  "/(app)/memories": "images-outline",
  "/(app)/gratitude": "heart-outline",
  "/(app)/thought-dump": "sparkles-outline",
  "/(app)/emotional-timeline": "time-outline",
  "/(app)/cannot-think": "help-circle-outline",
  "/(app)/professional-users": "people-outline",
  "/(app)/telecare": "videocam-outline",
  "/(app)/nr1": "shield-checkmark-outline",
  "/(app)/institution-dashboard": "business-outline",
  "/(app)/chat": "chatbubble-ellipses-outline",
  "/(app)/mood": "heart-outline",
  "/(app)/sos": "warning-outline"
};

function ActionChip({
  label,
  route,
  tone = "soft"
}: {
  label: string;
  route: AppRoute;
  tone?: "soft" | "danger";
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDanger = tone === "danger";
  const labelColor = colors.textPrimary;
  const chipBasis = width < 520 ? "100%" : width < 900 ? "48%" : "31.5%";
  const chipShadow = shadowStyle({ color: colors.shadow, opacity: 0.22, radius: 12, offsetY: 6, elevation: 3 });
  const icon = ROUTE_ICONS[route] ?? "arrow-forward";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(route as never)}
      style={({ pressed }) => ({
        alignItems: "center",
        flexDirection: "row",
        alignSelf: "stretch",
        backgroundColor: isDanger ? colors.error : colors.surfaceStrong,
        borderColor: isDanger ? colors.error : colors.primary,
        borderCurve: "continuous",
        borderRadius: radii.pill,
        borderWidth: 1.5,
        ...(isDanger
          ? shadowStyle({ color: colors.shadowStrong, opacity: 0.26, radius: 14, offsetY: 8, elevation: 4 })
          : chipShadow),
        flexBasis: chipBasis,
        flexGrow: 0,
        flexShrink: 0,
        gap: 10,
        justifyContent: "flex-start",
        minHeight: 56,
        minWidth: 0,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        transform: [{ scale: pressed ? 0.985 : 1 }]
      })}
    >
      <Ionicons color={labelColor} name={icon} size={18} />
      <Text
        style={{
          color: labelColor,
          flex: 1,
          fontSize: 14,
          fontWeight: "800",
          lineHeight: 18,
          textAlign: "left"
        }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function Home() {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const firstName = user?.full_name?.trim() ? user.full_name.trim().split(/\s+/u)[0] : t("home.you");
  const compactHero = width < 520;
  const tightHero = width < 420 || height < 500;
  const heroTitleSize = width <= 360 ? 31 : tightHero ? 32 : width < 700 ? 34 : 38;
  const heroTitleLineHeight = width <= 360 ? 37 : tightHero ? 38 : width < 700 ? 40 : 44;
  const orbSize = compactHero
    ? Math.min(252, Math.max(204, width * 0.52))
    : Math.min(300, Math.max(220, width * 0.3));
  const paidAccess = hasPaidAccess(user);
  const paidRoleBlocked = isPaidRole(user?.role) && !paidAccess;
  const clinicalTelecareRole = user?.role === "PSYCHOLOGIST" || user?.role === "CLINIC" || user?.role === "HOSPITAL";
  const institutionalRole = Boolean(user?.role && INSTITUTION_ROLES.has(user.role));
  const professionalLinks =
    paidAccess && clinicalTelecareRole
      ? [
          ...(user?.role === "PSYCHOLOGIST"
            ? [{ label: t("home.professional.authorizedUsers"), route: "/(app)/professional-users" as AppRoute }]
            : []),
          { label: t("home.professional.telecare"), route: "/(app)/telecare" as AppRoute }
        ]
      : paidAccess && user?.role === "COMPANY"
        ? [{ label: t("home.company.nr1"), route: "/(app)/nr1" as AppRoute }]
        : [];
  const institutionalLinks =
    paidAccess && institutionalRole
      ? [{ label: t("home.institutional.dashboard"), route: "/(app)/institution-dashboard" as AppRoute }]
      : [];

  return (
    <Screen>
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 18, width: "100%" }}>
          <View style={{ flex: isDesktop ? 0.92 : undefined, maxWidth: isDesktop ? 420 : undefined, width: "100%" }}>
            <View style={{ alignItems: "center", gap: 16, width: "100%" }}>
              <AnimatedOrb accent={colors.primaryDark} state="idle" size={orbSize} onPress={() => router.push("/(app)/presence")} />
              <View
                style={{
                  alignItems: isDesktop ? "flex-start" : "center",
                  alignSelf: "stretch",
                  gap: 10,
                  maxWidth: 340
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 4 }}>
                  {t("home.care")}
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: compactHero ? 28 : 30,
                    fontWeight: "900",
                    lineHeight: 38,
                    textAlign: isDesktop ? "left" : "center"
                  }}
                >
                  {t("home.greeting", { name: firstName })}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 16,
                    lineHeight: 24,
                    textAlign: isDesktop ? "left" : "center"
                  }}
                >
                  {t("home.orbHint")}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: isDesktop ? "flex-start" : "center" }}>
                <Badge label={t("presence.active")} tone="info" />
                <Badge label={t("home.care.telecare")} tone="success" />
              </View>
            </View>
          </View>

          <View style={{ flex: isDesktop ? 1.08 : undefined, width: "100%" }}>
            <Card>
              <View style={{ gap: 16 }}>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 4 }}>
                    {t("home.care")}
                  </Text>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: heroTitleSize,
                      fontWeight: "900",
                      lineHeight: heroTitleLineHeight
                    }}
                  >
                    {t("home.question")}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 17, lineHeight: 26 }}>
                    {t("home.greeting", { name: firstName })}
                  </Text>
                </View>

                <View style={{ alignItems: "center", gap: 12, width: "100%", maxWidth: 560 }}>
                  <Button label={t("home.chat")} icon="chatbubble-ellipses-outline" onPress={() => router.push("/(app)/chat")} />
                  <View style={{ flexDirection: isMobile && width <= 360 ? "column" : "row", gap: 12, width: "100%" }}>
                    <View style={{ flex: 1 }}>
                      <Button label={t("home.care.mood")} icon="heart-outline" tone="soft" onPress={() => router.push("/(app)/mood")} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label="SOS" icon="warning-outline" tone="danger" onPress={() => router.push("/(app)/sos")} />
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </View>
      </View>

      <Card>
        <SectionTitle title={t("home.dailyPlan.title")} subtitle={t("home.dailyPlan.body")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <ActionChip label={t("home.care.journal")} route="/(app)/journal" />
          <ActionChip label={t("home.care.routine")} route="/(app)/routine" />
          <ActionChip label={t("home.care.summary")} route="/(app)/emotional-report" />
          <ActionChip label={t("home.care.sharing")} route="/(app)/sharing" />
          <ActionChip label={t("home.care.memories")} route="/(app)/memories" />
          <ActionChip label={t("home.care.gratitude")} route="/(app)/gratitude" />
          <ActionChip label={t("home.care.thoughtDump")} route="/(app)/thought-dump" />
          <ActionChip label={t("home.care.timeline")} route="/(app)/emotional-timeline" />
          <ActionChip label={t("home.care.cannotThink")} route="/(app)/cannot-think" />
        </View>
      </Card>

      {paidRoleBlocked ? (
        <Card>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900", letterSpacing: 2 }}>
            Acesso comercial
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "800", lineHeight: 24 }}>
            {paidAccessBlockTitle(user)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 23 }}>
            {paidAccessBlockMessage(user)}
          </Text>
          <Button label={paidAccessActionLabel(user)} icon="card-outline" tone="soft" onPress={() => router.push("/(app)/plans" as never)} />
        </Card>
      ) : null}

      {professionalLinks.length ? (
        <Card>
          <SectionTitle
            title={user?.role === "COMPANY" ? t("home.orgHealth") : t("home.authorizedCare")}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {professionalLinks.map((item) => (
              <ActionChip key={item.route} label={item.label} route={item.route} />
            ))}
          </View>
        </Card>
      ) : null}

      {institutionalLinks.length ? (
        <Card>
          <SectionTitle title={t("home.institutional.dashboard")} subtitle={t("home.institutional.summary")} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {institutionalLinks.map((item) => (
              <ActionChip key={item.route} label={item.label} route={item.route} />
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
