import { useMutation } from "@tanstack/react-query";
import { Href, Link, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { requestPasswordReset } from "@/lib/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({
    mutationFn: requestPasswordReset
  });
  const resetToken = mutation.data?.reset_token ?? null;
  const showDevResetToken = __DEV__ && Boolean(resetToken);

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
        <AuthHero
          kicker="Acesso"
          orbSize={200}
          subtitle="Informe o e-mail da conta. Se ela existir, enviaremos as instruções de recuperação."
          title="Recuperar senha"
        />
        <View style={{ maxWidth: 560, minWidth: 0, width: "100%" }}>
          <View className="gap-3">
            <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <ErrorText message={mutation.error?.message} />
            {mutation.data ? (
              <View className="gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
                <Text className="text-sm leading-5 text-ink dark:text-white">{mutation.data.message}</Text>
                <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                  Verifique também spam ou lixo eletrônico. O código expira em 30 minutos.
                </Text>
                {showDevResetToken && resetToken ? (
                  <View className="gap-3">
                    <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                      Recuperação de teste disponível apenas em ambiente local. O código não é exibido na tela.
                    </Text>
                    <Button
                      label="Abrir redefinição local"
                      tone="soft"
                      onPress={() =>
                        router.push({
                          pathname: "/(auth)/reset-password",
                          params: { token: resetToken }
                        })
                      }
                    />
                  </View>
                ) : (
                  <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
                    Em build normal, siga as instruções enviadas por e-mail. O token de desenvolvimento não é exibido.
                  </Text>
                )}
              </View>
            ) : null}
            <Button
              label="Enviar instruções"
              loading={mutation.isPending}
              disabled={email.trim().length < 5}
              onPress={() => mutation.mutate(email)}
            />
            <Link href={"/(auth)/reset-password" as Href} className="text-center text-sm font-semibold text-primary">
              Já tenho um código
            </Link>
          </View>
        </View>
      </View>
    </Screen>
  );
}
