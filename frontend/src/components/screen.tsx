import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-ink"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        className="flex-1 bg-ink"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          minHeight: "100%",
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: Math.max(insets.bottom + 28, 40),
          gap: 24
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-6">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
