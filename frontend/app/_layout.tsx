import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

const BACKGROUND = "#0F1220";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={BACKGROUND} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: BACKGROUND }
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
