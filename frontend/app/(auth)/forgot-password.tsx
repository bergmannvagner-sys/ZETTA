import { useMutation } from "@tanstack/react-query";
import { Href, Link, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { requestPasswordReset } from "@/lib/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: requestPasswordReset
  });

  return (
    <Screen>
      <View className="gap-2 pt-2">
        <Text className="text-xs font-semibold tracking-[5px] text-mint">ACESSO</Text>
        <Text className="text-3xl font-semibold text-white">Recuperar senha</Text>
        <Text className="text-base leading-6 text-muted">
          Informe o email da conta. Se ela existir, enviaremos as instrucoes de recuperacao.
        </Text>
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <ErrorText message={mutation.error?.message} />
      {mutation.data ? (
        <View className="gap-3 rounded-xl border border-mint/20 bg-mint/10 px-4 py-3">
          <Text className="text-sm leading-5 text-white">{mutation.data.message}</Text>
          <Text className="text-xs leading-5 text-muted">
            Verifique tambem spam ou lixo eletronico. O codigo expira em 30 minutos.
          </Text>
          {mutation.data.reset_token ? (
            <View className="gap-3">
              <Text selectable className="text-xs leading-5 text-muted">
                Codigo de desenvolvimento: {mutation.data.reset_token}
              </Text>
              <Button
                label="Usar este codigo"
                tone="soft"
                onPress={() =>
                  router.push({
                    pathname: "/(auth)/reset-password",
                    params: { token: mutation.data?.reset_token ?? "" }
                  })
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}
      <Button
        label="Enviar instrucoes"
        loading={mutation.isPending}
        disabled={email.trim().length < 5}
        onPress={() => mutation.mutate(email)}
      />
      <Link href={"/(auth)/reset-password" as Href} className="text-center text-sm font-semibold text-mint">
        Ja tenho um codigo
      </Link>
    </Screen>
  );
}
