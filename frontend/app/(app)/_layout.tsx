import { Redirect, Tabs, useSegments } from "expo-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme, useResponsiveLayout } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { normalizeAuthUser } from "@/lib/auth-user";
import { getMe } from "@/lib/auth";
import { hasPaidAccess, isPaidRole } from "@/lib/billing";
import { getConsentStatus } from "@/lib/privacy";
import { useAuthStore } from "@/store/auth-store";

function TabMark({ name, focused, color }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; color: string }) {
  const { isMobile } = useResponsiveLayout();
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: focused ? `${color}22` : "transparent",
        borderColor: focused ? `${color}55` : "transparent",
        borderCurve: "continuous",
        borderRadius: 999,
        borderWidth: 1,
        boxShadow: focused ? `0 0 18px ${color}33` : "none",
        height: isMobile ? 38 : 40,
        justifyContent: "center",
        minWidth: isMobile ? 38 : 40,
        paddingHorizontal: isMobile ? 8 : 9,
        transform: [{ translateY: focused ? -1 : 0 }]
      }}
    >
      <Ionicons name={name} color={color} size={isMobile ? 20 : 21} />
    </View>
  );
}

export default function AppLayout() {
  const { colors } = useAppTheme();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const { t } = useI18n();
  const segments = useSegments();
  const { accessToken, hydrated, updateUser, user } = useAuthStore();
  const routeName = String(segments[1] ?? "");
  const me = useQuery({
    queryKey: ["users-me"],
    queryFn: getMe,
    enabled: hydrated && Boolean(accessToken) && Boolean(user),
    retry: false,
    staleTime: 30000
  });
  const consent = useQuery({
    queryKey: ["lgpd-consent", user?.id],
    queryFn: getConsentStatus,
    enabled:
      hydrated &&
      Boolean(accessToken) &&
      Boolean(user) &&
      user?.status === "ACTIVE" &&
      user?.role !== "SUPER_ADMIN",
    retry: false,
    staleTime: 30000
  });

  useEffect(() => {
    if (!me.data) {
      return;
    }
    const normalizedUser = normalizeAuthUser(me.data as Record<string, unknown>);
    if (normalizedUser && JSON.stringify(normalizedUser) !== JSON.stringify(user)) {
      void updateUser(normalizedUser);
    }
  }, [me.data, updateUser, user]);

  if (hydrated && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  const adminRoute = routeName.startsWith("admin-");
  const professionalRoute = routeName.startsWith("professional-");
  const nr1Route = routeName === "nr1";
  const institutionRoute = routeName === "institution-dashboard";
  const institutionRouteRoles = new Set(["CLINIC", "HOSPITAL", "NGO", "PUBLIC_INSTITUTION"]);
  const pendingAllowed = new Set(["verification", "profile", "plans"]);
  const paidBlockedAllowed = new Set(["plans", "profile", "privacy", "consent", "verification"]);
  const consentAllowed = new Set(["consent", "privacy", "profile", "plans"]);

  if (hydrated && user && user.status !== "ACTIVE" && !pendingAllowed.has(routeName)) {
    return <Redirect href="/(app)/verification" />;
  }

  if (hydrated && user && user.status === "ACTIVE" && adminRoute && user.role !== "SUPER_ADMIN") {
    return <Redirect href="/(app)/home" />;
  }

  if (
    hydrated &&
    user &&
    user.status === "ACTIVE" &&
    user.role !== "SUPER_ADMIN" &&
    isPaidRole(user.role) &&
    !hasPaidAccess(user) &&
    !paidBlockedAllowed.has(routeName)
  ) {
    return <Redirect href="/(app)/plans" />;
  }

  if (
    hydrated &&
    user &&
    user.status === "ACTIVE" &&
    user.role !== "SUPER_ADMIN" &&
    consent.data?.accepted === false &&
    !consentAllowed.has(routeName)
  ) {
    return <Redirect href="/(app)/consent" />;
  }

  if (
    hydrated &&
    user &&
    professionalRoute &&
    (user.role !== "PSYCHOLOGIST" || !hasPaidAccess(user))
  ) {
    return <Redirect href="/(app)/home" />;
  }

  if (hydrated && user && nr1Route && (user.role !== "COMPANY" || !hasPaidAccess(user))) {
    return <Redirect href="/(app)/home" />;
  }

  if (
    hydrated &&
    user &&
    institutionRoute &&
    (!institutionRouteRoles.has(user.role) || !hasPaidAccess(user))
  ) {
    return <Redirect href="/(app)/home" />;
  }

  const hiddenScreenOptions = { href: null };
  const tabBarRadius = isMobile ? 22 : isDesktop ? 30 : 26;

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingBottom: isMobile ? 4 : 6,
          paddingTop: isMobile ? 4 : 6
        },
        tabBarStyle: {
          backgroundColor: colors.glass,
          borderColor: colors.border,
          borderTopWidth: 1,
          borderRadius: tabBarRadius,
          boxShadow: `0 18px 34px ${colors.shadowStrong}`,
          marginBottom: isDesktop ? 16 : 8,
          marginHorizontal: isDesktop ? 20 : isMobile ? 0 : 10,
          minHeight: isMobile ? 78 : 74,
          overflow: "hidden",
          paddingBottom: isMobile ? 12 : 10,
          paddingHorizontal: isMobile ? 10 : 16,
          paddingTop: isMobile ? 8 : 10
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tab.home"),
          tabBarIcon: ({ color, focused }) => <TabMark color={color} focused={focused} name="home-outline" />
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: t("tab.checkin"),
          tabBarIcon: ({ color, focused }) => <TabMark color={color} focused={focused} name="heart-outline" />
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tab.ai"),
          tabBarIcon: ({ color, focused }) => <TabMark color={color} focused={focused} name="chatbubble-ellipses-outline" />
        }}
      />
      <Tabs.Screen
        name="emotional-report"
        options={{
          title: t("tab.progress"),
          tabBarIcon: ({ color, focused }) => <TabMark color={color} focused={focused} name="analytics-outline" />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tab.profile"),
          tabBarIcon: ({ color, focused }) => <TabMark color={color} focused={focused} name="person-outline" />
        }}
      />
      <Tabs.Screen name="presence" options={{ ...hiddenScreenOptions, title: t("route.presence") }} />
      <Tabs.Screen name="quick-checkin" options={{ ...hiddenScreenOptions, title: t("route.quickCheckin") }} />
      <Tabs.Screen name="cannot-think" options={{ ...hiddenScreenOptions, title: t("route.cannotThink") }} />
      <Tabs.Screen name="thought-dump" options={{ ...hiddenScreenOptions, title: t("route.thoughtDump") }} />
      <Tabs.Screen name="emotional-timeline" options={{ ...hiddenScreenOptions, title: t("route.emotionalTimeline") }} />
      <Tabs.Screen name="positive-memories" options={{ ...hiddenScreenOptions, title: t("route.positiveMemories") }} />
      <Tabs.Screen name="gratitude" options={{ ...hiddenScreenOptions, title: t("route.gratitude") }} />
      <Tabs.Screen name="memories" options={{ ...hiddenScreenOptions, title: t("route.memories") }} />
      <Tabs.Screen name="journal" options={{ ...hiddenScreenOptions, title: t("route.journal") }} />
      <Tabs.Screen name="routine" options={{ ...hiddenScreenOptions, title: t("route.routine") }} />
      <Tabs.Screen name="sharing" options={{ ...hiddenScreenOptions, title: t("route.sharing") }} />
      <Tabs.Screen name="my-connections" options={{ ...hiddenScreenOptions, title: t("route.myConnections") }} />
      <Tabs.Screen name="telecare" options={{ ...hiddenScreenOptions, title: t("route.telecare") }} />
      <Tabs.Screen name="telecare-room" options={{ ...hiddenScreenOptions, title: t("route.telecareRoom") }} />
      <Tabs.Screen name="professional-users" options={{ ...hiddenScreenOptions, title: t("route.professionalUsers") }} />
      <Tabs.Screen name="professional-user-detail" options={{ ...hiddenScreenOptions, title: t("route.professionalUserDetail") }} />
      <Tabs.Screen name="nr1" options={{ ...hiddenScreenOptions, title: "NR-1" }} />
      <Tabs.Screen name="institution-dashboard" options={{ ...hiddenScreenOptions, title: t("route.institutionDashboard") }} />
      <Tabs.Screen name="sos" options={{ ...hiddenScreenOptions, title: t("route.sos") }} />
      <Tabs.Screen name="plans" options={{ ...hiddenScreenOptions, title: t("route.plans") }} />
      <Tabs.Screen name="privacy" options={{ ...hiddenScreenOptions, title: t("route.privacy") }} />
      <Tabs.Screen name="verification" options={{ ...hiddenScreenOptions, title: t("route.verification") }} />
      <Tabs.Screen name="consent" options={{ ...hiddenScreenOptions, title: t("route.consent") }} />
      <Tabs.Screen name="admin-pending-accounts" options={{ ...hiddenScreenOptions, title: t("route.adminPendingAccounts") }} />
      <Tabs.Screen name="admin-operations" options={{ ...hiddenScreenOptions, title: t("route.adminOperations") }} />
      <Tabs.Screen name="admin-moderated-accounts" options={{ ...hiddenScreenOptions, title: t("route.adminModeratedAccounts") }} />
      <Tabs.Screen name="admin-subscriptions" options={{ ...hiddenScreenOptions, title: t("route.adminSubscriptions") }} />
      <Tabs.Screen name="admin-billing-pending" options={{ ...hiddenScreenOptions, title: t("route.adminBillingPending") }} />
      <Tabs.Screen name="admin-commercial-plans" options={{ ...hiddenScreenOptions, title: t("route.adminCommercialPlans") }} />
      <Tabs.Screen name="admin-billing-config" options={{ ...hiddenScreenOptions, title: t("route.adminBillingConfig") }} />
      <Tabs.Screen name="admin-billing-webhooks" options={{ ...hiddenScreenOptions, title: "Webhooks" }} />
      <Tabs.Screen name="admin-alerts" options={{ ...hiddenScreenOptions, title: t("route.adminAlerts") }} />
      <Tabs.Screen name="admin-email-config" options={{ ...hiddenScreenOptions, title: t("route.adminEmailConfig") }} />
      <Tabs.Screen name="admin-audit" options={{ ...hiddenScreenOptions, title: t("route.adminAudit") }} />
    </Tabs>
  );
}
