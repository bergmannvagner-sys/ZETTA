import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, Header, SectionTitle } from "@/components/ui";
import { radii, useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { hasPaidAccess, planLabel, subscriptionStatusLabel } from "@/lib/billing";
import { getMyConnectionCode } from "@/lib/emotional";
import { useAuthStore } from "@/store/auth-store";

export default function Profile() {
  const { colors } = useAppTheme();
  const { language, languages, setLanguage, t } = useI18n();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const languageChipBasis = width < 420 ? "31.5%" : "31.5%";
  const canShareCode =
    user?.status === "ACTIVE" && (user.role === "PSYCHOLOGIST" || user.role === "COMPANY") && hasPaidAccess(user);

  const connectionCode = useQuery({
    queryKey: ["my-connection-code"],
    queryFn: getMyConnectionCode,
    enabled: canShareCode
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 24, width: "100%" }}>
        <View style={{ gap: 10, maxWidth: 640, width: "100%" }}>
          <Header align="center" title={t("profile.title")} subtitle={t("language.subtitle")} />
        </View>

        <View style={{ gap: 20, maxWidth: 960, width: "100%" }}>
          <Card>
            <Text selectable style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "800", lineHeight: 26 }}>
              {user?.full_name}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              {user?.email}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              {t("profile.role", { value: user?.role })}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              {t("profile.status", { value: user?.status })}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              {t("profile.plan", { value: planLabel(user?.subscription_plan) })}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              {t("profile.subscription", { value: subscriptionStatusLabel(user?.subscription_status) })}
            </Text>
            {canShareCode && connectionCode.data ? (
              <Text selectable style={{ color: colors.primary, fontSize: 15, fontWeight: "800", lineHeight: 22 }}>
                {t("profile.connectionCode", { value: connectionCode.data.connection_code })}
              </Text>
            ) : null}
          </Card>

          <Card>
            <SectionTitle title={t("language.title")} subtitle={t("language.current")} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {languages.map((option) => {
                const selected = option.code === language;
                return (
                  <Pressable
                    key={option.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => void setLanguage(option.code)}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: selected ? colors.gradientEnd : colors.surfaceStrong,
                      borderColor: selected ? colors.primaryLight : colors.primary,
                      borderCurve: "continuous",
                      borderRadius: radii.pill,
                      borderWidth: 1.5,
                      boxShadow: selected ? `0 8px 18px ${colors.shadowStrong}` : "none",
                      justifyContent: "center",
                      flexBasis: languageChipBasis,
                      flexGrow: 0,
                      flexShrink: 0,
                      minHeight: 48,
                      minWidth: 0,
                      opacity: pressed ? 0.82 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 12
                    })}
                  >
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: 15,
                        fontWeight: "800",
                        lineHeight: 20
                      }}
                    >
                      {option.nativeLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {user?.role === "SUPER_ADMIN" ? (
            <Card>
              <SectionTitle title="Painéis administrativos" subtitle="Acesso restrito ao administrador interno." />
              <View style={{ gap: 10 }}>
                <Button
                  label="Resumo operacional"
                  icon="analytics-outline"
                  tone="soft"
                  onPress={() => router.push("/(app)/admin-operations" as never)}
                />
                <Button
                  label="Contas pendentes"
                  icon="hourglass-outline"
                  tone="soft"
                  onPress={() => router.push("/(app)/admin-pending-accounts" as never)}
                />
                <Button label="Assinaturas" icon="card-outline" tone="soft" onPress={() => router.push("/(app)/admin-subscriptions" as never)} />
                <Button
                  label="Pendências financeiras"
                  icon="warning-outline"
                  tone="soft"
                  onPress={() => router.push("/(app)/admin-billing-pending" as never)}
                />
                <Button
                  label="Contas moderadas"
                  icon="shield-checkmark-outline"
                  tone="soft"
                  onPress={() => router.push("/(app)/admin-moderated-accounts" as never)}
                />
                <Button label="Planos comerciais" icon="pricetag-outline" tone="soft" onPress={() => router.push("/(app)/admin-commercial-plans" as never)} />
                <Button label="Configurar pagamentos" icon="cash-outline" tone="soft" onPress={() => router.push("/(app)/admin-billing-config" as never)} />
                <Button label="Monitorar webhooks" icon="pulse-outline" tone="soft" onPress={() => router.push("/(app)/admin-billing-webhooks" as never)} />
                <Button label="Alertas administrativos" icon="alert-circle-outline" tone="soft" onPress={() => router.push("/(app)/admin-alerts" as never)} />
                <Button label="Configurar e-mail" icon="mail-outline" tone="soft" onPress={() => router.push("/(app)/admin-email-config" as never)} />
                <Button label="Auditoria" icon="journal-outline" tone="soft" onPress={() => router.push("/(app)/admin-audit" as never)} />
              </View>
            </Card>
          ) : null}

          <Button label={t("profile.planAccess")} icon="card-outline" tone="soft" onPress={() => router.push("/(app)/plans" as never)} />
          <Button
            label={t("common.exit")}
            icon="log-out-outline"
            tone="soft"
            onPress={async () => {
              await clearSession();
              router.replace("/(auth)/login");
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
