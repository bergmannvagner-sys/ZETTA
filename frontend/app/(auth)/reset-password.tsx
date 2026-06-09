import { useMutation } from "@tanstack/react-query";
import { Href, Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { AuthHero } from "@/components/auth/AuthHero";
import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { confirmPasswordReset } from "@/lib/auth";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (params.token && !token) {
      setToken(params.token);
    }
  }, [params.token, token]);

  const mutation = useMutation({
    mutationFn: confirmPasswordReset,
    onSuccess: () => {
      router.replace("/(auth)/login");
    }
  });

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 14, width: "100%" }}>
        <AuthHero
          kicker="Segurança"
          orbSize={176}
          subtitle="Use o código recebido e defina uma senha nova para voltar com segurança."
          title="Nova senha"
        />
        <View style={{ maxWidth: 560, minWidth: 0, width: "100%" }}>
          <View className="gap-3">
            <Field label="Código" value={token} onChangeText={setToken} />
            <Field label="Nova senha" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Field
              label="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <Button
              label="Atualizar senha"
              loading={mutation.isPending}
              disabled={token.trim().length < 32 || newPassword.length < 8 || confirmPassword.length < 8}
              onPress={() => {
                setLocalError(null);
                if (newPassword !== confirmPassword) {
                  setLocalError("As senhas não conferem.");
                  return;
                }
                mutation.mutate({ token, newPassword });
              }}
            />
            <ErrorText message={localError ?? mutation.error?.message} />
            <Text className="text-xs leading-5 text-muted dark:text-[#D1D5DB]">
              A senha deve ter pelo menos 8 caracteres. Ao confirmar, sessões antigas serão encerradas.
            </Text>
            <Link href={"/(auth)/forgot-password" as Href} className="text-center text-sm font-semibold text-primary">
              Solicitar novo código
            </Link>
          </View>
        </View>
      </View>
    </Screen>
  );
}
