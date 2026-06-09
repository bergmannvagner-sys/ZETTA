import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme, useResponsiveLayout } from "@/design-system/theme";

export function ScreenContainer({ children }: { children: ReactNode }) {
  const { contentMaxWidth, isDesktop, isTablet } = useResponsiveLayout();
  const rightInset = isDesktop ? 28 : isTablet ? 18 : 10;
  const leftInset = isDesktop ? 6 : isTablet ? 4 : 0;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        gap: 24,
        maxWidth: contentMaxWidth ?? (isDesktop ? 1120 : undefined),
        paddingLeft: leftInset,
        paddingRight: rightInset,
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
    <KeyboardAvoidingView
      style={{ backgroundColor: colors.background, flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <SafeAreaView edges={["left", "right", "bottom"]} style={{ backgroundColor: colors.background, flex: 1 }}>
        <ScrollView
          style={{ backgroundColor: colors.background, flex: 1 }}
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
  );
}
