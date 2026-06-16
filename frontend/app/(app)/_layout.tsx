import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#0F1220"
        }
      }}
    >
      <Stack.Screen name="home" />
    </Stack>
  );
}
