import { useMutation } from "@tanstack/react-query";
import { Href, Link, router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Button, Card, ErrorText, Field } from "@/components/ui";
import { useI18n } from "@/i18n/i18n";
import { login } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

export default function Login() {
  const { t } = useI18n();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const orbSize = 220;

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      await setSession(data.access_token, data.refresh_token, data.user);
      router.replace(data.user.status === "ACTIVE" ? "/(app)/consent" : "/(app)/verification");
    }
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          kicker={t("auth.login.kicker")}
          orbSize={orbSize}
          subtitle={t("auth.login.subtitle")}
          title={t("auth.login.title")}
        />

        <View style={{ maxWidth: 560, minWidth: 0, width: "100%" }}>
          <Card>
            <View style={{ gap: 18 }}>
              <View style={{ gap: 14 }}>
                <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
              </View>
              <ErrorText message={mutation.error?.message} />
              <Button label="Entrar" loading={mutation.isPending} onPress={() => mutation.mutate({ email, password })} />
              <View style={{ gap: 12 }}>
                <Link href="/(auth)/select-role" className="text-center text-base font-semibold text-primary">
                  {t("auth.login.create")}
                </Link>
                <Link
                  href={"/(auth)/forgot-password" as Href}
                  className="text-center text-sm font-semibold text-muted dark:text-[#D1D5DB]"
                >
                  {t("auth.login.forgot")}
                </Link>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
