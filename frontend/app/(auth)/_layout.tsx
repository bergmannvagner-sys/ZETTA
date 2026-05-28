import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0F1F" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#0A0F1F" }
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: "" }} />
      <Stack.Screen name="reset-password" options={{ title: "" }} />
      <Stack.Screen name="register" options={{ title: "" }} />
      <Stack.Screen name="select-role" options={{ title: "" }} />
    </Stack>
  );
}
