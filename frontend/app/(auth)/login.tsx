import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { useAppTheme, useResponsiveLayout } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";
import { login } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

export default function Login() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const { isDesktop, isMobile, width } = useResponsiveLayout();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const orbSize = isDesktop ? 244 : isMobile ? Math.min(222, Math.max(196, width * 0.48)) : 228;

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      await setSession(data.access_token, data.refresh_token, data.user);
      router.replace(data.user.status === "ACTIVE" ? "/(app)/home" : "/(app)/verification");
    }
  });

  return (
    <Screen>
      <View
        style={{
          alignItems: "stretch",
          flexDirection: isDesktop ? "row" : "column",
          gap: 18,
          width: "100%"
        }}
      >
        <View style={{ flex: isDesktop ? 1 : undefined, maxWidth: isDesktop ? 560 : 640, width: "100%" }}>
          <AuthHero
            accent={colors.primaryDark}
            kicker={t("auth.login.kicker")}
            orbSize={orbSize}
            subtitle={t("auth.login.subtitle")}
            title={t("auth.login.title")}
          />
        </View>

        <View style={{ flex: isDesktop ? 1 : undefined, maxWidth: 520, minWidth: 0, width: "100%" }}>
          <Card>
            <View style={{ gap: 18 }}>
              <View style={{ gap: 14 }}>
                <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
              </View>
              <ErrorText message={mutation.error?.message} />
              <Button
                label="Entrar"
                icon="log-in-outline"
                loading={mutation.isPending}
                onPress={() => mutation.mutate({ email, password })}
              />
              <View style={{ alignItems: "center", flexDirection: "row", gap: 14, justifyContent: "center" }}>
                <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/select-role" as never)}>
                  <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
                    <Ionicons color={colors.primary} name="person-add-outline" size={16} />
                    <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "800", lineHeight: 20 }}>
                      {t("auth.login.create")}
                    </Text>
                  </View>
                </Pressable>
                <View style={{ backgroundColor: colors.border, height: 14, width: 1 }} />
                <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/forgot-password" as never)}>
                  <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
                    <Ionicons color={colors.textSecondary} name="key-outline" size={15} />
                    <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "700", lineHeight: 18 }}>
                      {t("auth.login.forgot")}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
