import { useMutation } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, ErrorText, Field } from "@/components/ui";
import { login } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

export default function Login() {
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      await setSession(data.access_token, data.refresh_token, data.user);
      router.replace(data.user.status === "ACTIVE" ? "/(app)/consent" : "/(app)/verification");
    }
  });

  return (
    <Screen>
      <View className="gap-4 pt-5">
        <Text className="text-xs font-semibold tracking-[6px] text-mint">ZETTA</Text>
        <View className="gap-2">
          <Text className="text-4xl font-semibold text-white">Bergmann</Text>
          <Text className="text-base leading-6 text-muted">Entre para continuar seu cuidado emocional.</Text>
        </View>
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorText message={mutation.error?.message} />
      <Button
        label="Entrar"
        loading={mutation.isPending}
        onPress={() => mutation.mutate({ email, password })}
      />
      <Link href="/(auth)/select-role" className="text-center text-base font-semibold text-mint">
        Criar conta
      </Link>
    </Screen>
  );
}
