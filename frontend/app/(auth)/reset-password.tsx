import { useMutation } from "@tanstack/react-query";
import { Href, Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

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
      <View className="gap-2 pt-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">SEGURANCA</Text>
        <Text className="text-3xl font-semibold text-white">Nova senha</Text>
        <Text className="text-base leading-6 text-muted">
          Use o codigo recebido e defina uma senha nova para voltar com seguranca.
        </Text>
      </View>
      <Field label="Codigo" value={token} onChangeText={setToken} />
      <Field label="Nova senha" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <Field
        label="Confirmar nova senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <Text className="text-xs leading-5 text-muted">
        A senha deve ter pelo menos 8 caracteres. Ao confirmar, sessoes antigas serao encerradas.
      </Text>
      <ErrorText message={localError ?? mutation.error?.message} />
      <Button
        label="Atualizar senha"
        loading={mutation.isPending}
        disabled={token.trim().length < 32 || newPassword.length < 8 || confirmPassword.length < 8}
        onPress={() => {
          setLocalError(null);
          if (newPassword !== confirmPassword) {
            setLocalError("As senhas nao conferem.");
            return;
          }
          mutation.mutate({ token, newPassword });
        }}
      />
      <Link href={"/(auth)/forgot-password" as Href} className="text-center text-sm font-semibold text-mint">
        Solicitar novo codigo
      </Link>
    </Screen>
  );
}
