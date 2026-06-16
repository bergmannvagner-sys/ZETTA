import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerShown: false,
        contentStyle: { backgroundColor: "#0F1220" }
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}
