import { router } from "expo-router";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { Screen } from "@/components/screen";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
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

function ActionChip({ label, route, tone = "soft" }: { label: string; route: AppRoute; tone?: "soft" | "danger" }) {
  const { colors, isDark } = useAppTheme();
  const isDanger = tone === "danger";
  const labelColor = isDanger ? colors.error : isDark ? colors.primary : colors.primaryDark;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(route as never)}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: isDanger ? `${colors.error}18` : colors.surfaceStrong,
        borderColor: isDanger ? `${colors.error}88` : `${colors.primary}88`,
        borderCurve: "continuous",
        borderRadius: radii.pill,
        borderWidth: 1.5,
        boxShadow: `0 10px 24px ${colors.shadow}`,
        flexGrow: 1,
        justifyContent: "center",
        minHeight: 48,
        minWidth: 128,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        transform: [{ scale: pressed ? 0.985 : 1 }]
      })}
    >
      <Text
        style={{
          color: labelColor,
          fontSize: 15,
          fontWeight: "800",
          lineHeight: 20
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function Home() {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const { isMobile } = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const firstName = user?.full_name.split(" ")[0] ?? t("home.you");
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
        <View
          style={{
            alignItems: "center",
            backgroundColor: isDark ? colors.surfaceSoft : colors.surface,
            borderColor: colors.border,
            borderCurve: "continuous",
            borderRadius: radii.xl,
            borderWidth: 1,
            boxShadow: `0 18px 54px ${colors.shadow}`,
            gap: 24,
            overflow: "hidden",
            paddingHorizontal: isMobile ? 18 : 28,
            paddingVertical: compactHero ? 22 : isMobile ? 24 : 30,
            width: "100%"
          }}
        >
          <View style={{ alignItems: "center", gap: 20, maxWidth: 760, width: "100%" }}>
            <AnimatedOrb state="idle" size={orbSize} onPress={() => router.push("/(app)/presence")} />

            <View style={{ alignItems: "center", gap: 10, maxWidth: 620, width: "100%" }}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800", letterSpacing: 4 }}>
                {t("home.care")}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 17, lineHeight: 24, textAlign: "center" }}>
                {t("home.greeting", { name: firstName })}
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: heroTitleSize,
                  fontWeight: "900",
                  lineHeight: heroTitleLineHeight,
                  textAlign: "center"
                }}
              >
                {t("home.question")}
              </Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              <Badge label={t("presence.active")} tone="info" />
              <Badge label={t("home.care.telecare")} tone="success" />
            </View>

            <View style={{ alignItems: "center", gap: 12, width: "100%", maxWidth: 560 }}>
              <Button label={t("home.chat")} onPress={() => router.push("/(app)/chat")} />
              <View style={{ flexDirection: isMobile && width <= 360 ? "column" : "row", gap: 12, width: "100%" }}>
                <View style={{ flex: 1 }}>
                  <Button label={t("home.care.mood")} tone="soft" onPress={() => router.push("/(app)/mood")} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="SOS" tone="danger" onPress={() => router.push("/(app)/sos")} />
                </View>
              </View>
            </View>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                lineHeight: 20,
                maxWidth: 320,
                textAlign: "center"
              }}
            >
              {t("home.orbHint")}
            </Text>
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
          <Button label={paidAccessActionLabel(user)} tone="soft" onPress={() => router.push("/(app)/plans" as never)} />
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
