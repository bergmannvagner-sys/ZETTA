import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme, useResponsiveLayout } from "@/design-system/theme";

function Backdrop() {
  const { colors } = useAppTheme();
  const { width, height } = useResponsiveLayout();
  const baseSize = Math.max(width, height);

  return (
    <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject }}>
      <View style={{ backgroundColor: colors.background, flex: 1 }} />
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: baseSize,
          height: baseSize * 0.42,
          left: -baseSize * 0.14,
          opacity: 0.18,
          position: "absolute",
          top: -baseSize * 0.18,
          width: baseSize * 0.42,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 60
        }}
      />
      <View
        style={{
          backgroundColor: colors.primaryDark,
          borderRadius: baseSize,
          bottom: -baseSize * 0.22,
          height: baseSize * 0.5,
          opacity: 0.14,
          position: "absolute",
          right: -baseSize * 0.18,
          width: baseSize * 0.5,
          shadowColor: colors.primaryDark,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.24,
          shadowRadius: 72
        }}
      />
      <View
        style={{
          backgroundColor: colors.info,
          borderRadius: baseSize,
          height: baseSize * 0.34,
          opacity: 0.1,
          position: "absolute",
          right: -baseSize * 0.08,
          top: baseSize * 0.12,
          width: baseSize * 0.34,
          shadowColor: colors.info,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 52
        }}
      />
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          height: 1,
          left: 0,
          opacity: 0.24,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
    </View>
  );
}

export function ScreenContainer({ children }: { children: ReactNode }) {
  const { contentMaxWidth, isDesktop } = useResponsiveLayout();

  return (
    <View
      style={{
        alignSelf: "center",
        gap: 24,
        maxWidth: contentMaxWidth ?? (isDesktop ? 1120 : undefined),
        width: "100%"
      }}
    >
      {children}
    </View>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { horizontalPadding, isDesktop } = useResponsiveLayout();

  return (
    <View style={{ backgroundColor: colors.background, flex: 1, overflow: "hidden" }}>
      <Backdrop />
      <KeyboardAvoidingView
        style={{ backgroundColor: "transparent", flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <SafeAreaView edges={["left", "right", "bottom"]} style={{ backgroundColor: "transparent", flex: 1 }}>
          <ScrollView
            style={{ backgroundColor: "transparent", flex: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              minHeight: "100%",
              paddingBottom: Math.max(insets.bottom + 108, 124),
              paddingHorizontal: horizontalPadding,
              paddingTop: Math.max(insets.top + 16, isDesktop ? 36 : 28)
            }}
            keyboardShouldPersistTaps="handled"
          >
            <ScreenContainer>{children}</ScreenContainer>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
