import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

const BACKGROUND = "#0F1220";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ backgroundColor: BACKGROUND, flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar backgroundColor={BACKGROUND} style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: BACKGROUND },
            headerShown: false
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="support" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
