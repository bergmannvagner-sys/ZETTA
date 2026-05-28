import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/store/auth-store";

export default function AppLayout() {
  const { hydrated, user } = useAuthStore();

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
      <Stack.Screen name="emotional-report" options={{ title: "Relatorio emocional" }} />
      <Stack.Screen name="professional-users" options={{ title: "Acompanhamento" }} />
      <Stack.Screen name="professional-user-detail" options={{ title: "Detalhe autorizado" }} />
      <Stack.Screen name="nr1" options={{ title: "NR-1" }} />
      <Stack.Screen name="sos" options={{ title: "SOS emocional" }} />
      <Stack.Screen name="profile" options={{ title: "Perfil" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacidade" }} />
      <Stack.Screen name="verification" options={{ title: "Conta em analise" }} />
      <Stack.Screen name="consent" options={{ title: "Consentimento" }} />
      <Stack.Screen name="admin-pending-accounts" options={{ title: "Contas pendentes" }} />
    </Stack>
  );
}
