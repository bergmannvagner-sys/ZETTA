import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { OrbState } from "@/components/orb/orbTypes";
import { Screen } from "@/components/screen";
import { Button, Card, SectionTitle } from "@/components/ui";
import { ZettaMindPanel } from "@/components/zetta-metrics";
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
import { EmotionLog, JournalEntry, listEmotionLogs, listJournalEntries } from "@/lib/emotional";
import { buildZettaMindSnapshot } from "@/lib/zetta-intelligence";
import { useAuthStore } from "@/store/auth-store";

type AppRoute =
  | "/(app)/chat"
  | "/(app)/mood"
  | "/(app)/journal"
  | "/(app)/routine"
  | "/(app)/cannot-think"
  | "/(app)/thought-dump"
  | "/(app)/presence"
  | "/(app)/quick-checkin"
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
  "/(app)/presence": "leaf-outline",
  "/(app)/quick-checkin": "pulse-outline",
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

const WELLNESS_RESOURCES: Array<{ labelKey: string; route: AppRoute }> = [
  { labelKey: "home.wellness.breathing", route: "/(app)/presence" },
  { labelKey: "home.wellness.meditation", route: "/(app)/presence" },
  { labelKey: "home.wellness.relaxation", route: "/(app)/cannot-think" },
  { labelKey: "home.wellness.mindfulness", route: "/(app)/presence" },
  { labelKey: "home.wellness.sleep", route: "/(app)/routine" },
  { labelKey: "home.wellness.anxiety", route: "/(app)/cannot-think" },
  { labelKey: "home.wellness.stress", route: "/(app)/thought-dump" },
  { labelKey: "home.wellness.quickExercises", route: "/(app)/quick-checkin" },
  { labelKey: "home.wellness.relaxingSounds", route: "/(app)/presence" },
  { labelKey: "home.wellness.attention", route: "/(app)/presence" }
];

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
  const chipShadow = shadowStyle({ color: "#2A145A", opacity: 0.24, radius: 13, offsetY: 7, elevation: 3 });
  const icon = ROUTE_ICONS[route] ?? "arrow-forward";
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.push(route as never)}
      style={({ pressed }) => ({
        alignItems: "center",
        flexDirection: "row",
        alignSelf: "stretch",
        backgroundColor: isDanger ? colors.error : "#5B35A8",
        borderColor: isDanger ? "#FCA5A5" : "#8B6CDA",
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

function latestInteractionDate(log?: EmotionLog | null, entry?: JournalEntry | null): Date | null {
  const timestamps = [log?.created_at, entry?.created_at]
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) {
    return null;
  }
  return new Date(Math.max(...timestamps));
}

function HomeMetricCard({
  detail,
  label,
  tone,
  value
}: {
  detail: string;
  label: string;
  tone: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surfaceSoft,
        borderColor: colors.border,
        borderCurve: "continuous",
        borderRadius: radii.xl,
        borderWidth: 1,
        flexBasis: "30%",
        flexGrow: 1,
        gap: 8,
        minWidth: 180,
        padding: 16
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "900", letterSpacing: 1.1, lineHeight: 16 }}>
        {label}
      </Text>
      <Text style={{ color: colors.textPrimary, fontSize: 21, fontWeight: "900", lineHeight: 26 }}>
        {value}
      </Text>
      <Text style={{ color: tone, fontSize: 13, fontWeight: "800", lineHeight: 18 }}>
        {detail}
      </Text>
    </View>
  );
}

export default function Home() {
  const { colors } = useAppTheme();
  const { language, t } = useI18n();
  const { width, height } = useWindowDimensions();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const firstName = user?.full_name?.trim() ? user.full_name.trim().split(/\s+/u)[0] : t("home.you");
  const compactHero = width < 520;
  const tightHero = width < 420 || height < 500;
  const orbSize = compactHero
    ? Math.min(278, Math.max(214, width * 0.58))
    : Math.min(324, Math.max(236, width * 0.32));
  const paidAccess = hasPaidAccess(user);
  const paidRoleBlocked = isPaidRole(user?.role) && !paidAccess;
  const personalSignalsEnabled = user?.role === "USER" && user.status === "ACTIVE";
  const emotionLogs = useQuery({
    queryKey: ["home-emotion-logs"],
    queryFn: listEmotionLogs,
    enabled: personalSignalsEnabled,
    retry: false,
    staleTime: 30000
  });
  const journalEntries = useQuery({
    queryKey: ["home-journal-entries"],
    queryFn: listJournalEntries,
    enabled: personalSignalsEnabled,
    retry: false,
    staleTime: 30000
  });
  const mindSnapshot = buildZettaMindSnapshot(emotionLogs.data ?? [], journalEntries.data ?? []);
  const latestLog = emotionLogs.data?.[0] ?? null;
  const latestEntry = journalEntries.data?.[0] ?? null;
  const lastInteraction = latestInteractionDate(latestLog, latestEntry);
  const formattedLastInteraction = lastInteraction
    ? new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(lastInteraction)
    : t("home.metric.noInteraction");
  const homeOrbState: OrbState =
    mindSnapshot.status === "delicate"
      ? mindSnapshot.riskIndex !== null && mindSnapshot.riskIndex >= 96
        ? "crisis"
        : "low_energy"
      : latestEntry
        ? "journaling"
        : "assistant";
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
      <View style={{ alignItems: "center", gap: tightHero ? 14 : 20, width: "100%" }}>
        <AnimatedOrb
          accent={colors.primaryDark}
          audioLevel={mindSnapshot.status === "stable" ? 0.22 : 0.08}
          state={homeOrbState}
          size={orbSize}
          onPress={() => router.push("/(app)/presence")}
        />

        <View style={{ alignItems: "center", gap: 10, maxWidth: 680, width: "100%" }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 4 }}>
            ZETTA BERGMANN
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: compactHero ? 32 : isDesktop ? 42 : 36,
              fontWeight: "900",
              lineHeight: compactHero ? 38 : isDesktop ? 49 : 43,
              textAlign: "center"
            }}
          >
            {t("home.question")}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 24, textAlign: "center" }}>
            {t("home.greeting", { name: firstName })} {t("home.orbHint")}
          </Text>
        </View>

        <View style={{ gap: 12, maxWidth: 620, width: "100%" }}>
          <Button label={t("home.chat")} icon="chatbubble-ellipses-outline" onPress={() => router.push("/(app)/chat")} />
          <View style={{ flexDirection: isMobile && width <= 420 ? "column" : "row", gap: 12, width: "100%" }}>
            <View style={{ flex: 1 }}>
              <Button label={t("home.care.mood")} icon="heart-outline" tone="soft" onPress={() => router.push("/(app)/mood")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t("home.care.journal")} icon="book-outline" tone="soft" onPress={() => router.push("/(app)/journal")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="SOS" icon="warning-outline" tone="danger" onPress={() => router.push("/(app)/sos")} />
            </View>
          </View>
        </View>
      </View>

      <Card>
        <SectionTitle title={t("home.metrics.title")} subtitle={t("home.metrics.subtitle")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <HomeMetricCard
            detail={
              latestLog
                ? `${t("mood.intensity")}: ${latestLog.intensity}/10`
                : emotionLogs.isLoading
                  ? t("common.loading")
                  : t("home.metric.register")
            }
            label={t("home.metric.currentMood")}
            tone={colors.primary}
            value={latestLog?.mood ?? t("home.metric.register")}
          />
          <HomeMetricCard
            detail={
              mindSnapshot.riskIndex === null
                ? t("home.metric.generate")
                : `${t("zettaMind.riskIndex")} ${mindSnapshot.riskIndex}/100`
            }
            label={t("home.metric.emotionalEvolution")}
            tone={mindSnapshot.status === "delicate" ? colors.warning : mindSnapshot.status === "attention" ? colors.info : colors.success}
            value={t(`zettaMind.status.${mindSnapshot.status}`)}
          />
          <HomeMetricCard
            detail={latestEntry ? t("home.care.journal") : t("home.care.mood")}
            label={t("home.metric.lastInteraction")}
            tone={colors.info}
            value={formattedLastInteraction}
          />
        </View>
      </Card>

      {personalSignalsEnabled ? <ZettaMindPanel snapshot={mindSnapshot} /> : null}

      <Card>
        <SectionTitle title={t("home.secondaryCare.title")} subtitle={t("home.dailyPlan.body")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <ActionChip label={t("home.care.summary")} route="/(app)/emotional-report" />
          <ActionChip label={t("home.care.routine")} route="/(app)/routine" />
          <ActionChip label={t("home.care.sharing")} route="/(app)/sharing" />
          <ActionChip label={t("home.care.memories")} route="/(app)/memories" />
          <ActionChip label={t("home.care.gratitude")} route="/(app)/gratitude" />
          <ActionChip label={t("home.care.thoughtDump")} route="/(app)/thought-dump" />
          <ActionChip label={t("home.care.timeline")} route="/(app)/emotional-timeline" />
          <ActionChip label={t("home.care.cannotThink")} route="/(app)/cannot-think" />
        </View>
      </Card>

      <Card>
        <SectionTitle title={t("home.wellness.title")} subtitle={t("home.wellness.subtitle")} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {WELLNESS_RESOURCES.map((item) => (
            <ActionChip key={item.labelKey} label={t(item.labelKey)} route={item.route} />
          ))}
        </View>
      </Card>

      {paidRoleBlocked ? (
        <Card>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "900", letterSpacing: 2 }}>
            {t("home.commercialAccess")}
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
