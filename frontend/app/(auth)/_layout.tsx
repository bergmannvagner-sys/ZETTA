import { Stack } from "expo-router";

import { useAppTheme } from "@/design-system/theme";

export default function AuthLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background }
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
