import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#070B18" },
        headerTintColor: "#FFFFFF",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#070B18" }
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
