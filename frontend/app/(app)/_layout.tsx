import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

export default function AppLayout() {
  const { accessToken, hydrated, updateUser, user } = useAuthStore();
  const me = useQuery({
    queryKey: ["users-me"],
    queryFn: getMe,
    enabled: hydrated && Boolean(accessToken) && Boolean(user),
    retry: false,
    staleTime: 30000
  });

  useEffect(() => {
    if (me.data && JSON.stringify(me.data) !== JSON.stringify(user)) {
      void updateUser(me.data);
    }
  }, [me.data, updateUser, user]);

  if (hydrated && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0F1F" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#0A0F1F" }
      }}
    >
      <Stack.Screen name="home" options={{ title: "Bergmann" }} />
      <Stack.Screen name="chat" options={{ title: "Conversar" }} />
      <Stack.Screen name="journal" options={{ title: "Diario emocional" }} />
      <Stack.Screen name="mood" options={{ title: "Humor" }} />
      <Stack.Screen name="routine" options={{ title: "Rotina leve" }} />
      <Stack.Screen name="sharing" options={{ title: "Compartilhamento" }} />
      <Stack.Screen name="my-connections" options={{ title: "Meus vinculos" }} />
      <Stack.Screen name="emotional-report" options={{ title: "Relatorio emocional" }} />
      <Stack.Screen name="professional-users" options={{ title: "Acompanhamento" }} />
      <Stack.Screen name="professional-user-detail" options={{ title: "Detalhe autorizado" }} />
      <Stack.Screen name="nr1" options={{ title: "NR-1" }} />
      <Stack.Screen name="sos" options={{ title: "SOS emocional" }} />
      <Stack.Screen name="plans" options={{ title: "Plano e acesso" }} />
      <Stack.Screen name="profile" options={{ title: "Perfil" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacidade" }} />
      <Stack.Screen name="verification" options={{ title: "Conta em analise" }} />
      <Stack.Screen name="consent" options={{ title: "Consentimento" }} />
      <Stack.Screen name="admin-pending-accounts" options={{ title: "Contas pendentes" }} />
      <Stack.Screen name="admin-moderated-accounts" options={{ title: "Contas moderadas" }} />
      <Stack.Screen name="admin-subscriptions" options={{ title: "Assinaturas" }} />
      <Stack.Screen name="admin-billing-pending" options={{ title: "Pendencias financeiras" }} />
      <Stack.Screen name="admin-commercial-plans" options={{ title: "Planos comerciais" }} />
      <Stack.Screen name="admin-billing-config" options={{ title: "Pagamentos" }} />
      <Stack.Screen name="admin-billing-webhooks" options={{ title: "Webhooks" }} />
      <Stack.Screen name="admin-email-config" options={{ title: "Email" }} />
      <Stack.Screen name="admin-audit" options={{ title: "Auditoria" }} />
    </Stack>
  );
}
