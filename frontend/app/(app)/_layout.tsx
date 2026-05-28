import { Stack } from "expo-router";

export default function AppLayout() {
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
      <Stack.Screen name="sos" options={{ title: "SOS emocional" }} />
      <Stack.Screen name="profile" options={{ title: "Perfil" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacidade" }} />
      <Stack.Screen name="verification" options={{ title: "Conta em analise" }} />
      <Stack.Screen name="consent" options={{ title: "Consentimento" }} />
      <Stack.Screen name="admin-pending-accounts" options={{ title: "Contas pendentes" }} />
    </Stack>
  );
}
