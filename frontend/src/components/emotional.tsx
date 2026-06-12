import { ReactNode } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { radii, useAppTheme } from "@/design-system/theme";

export function EmotionalHeader({
  kicker,
  title,
  subtitle,
  align = "left"
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const center = align === "center";
  const titleSize = width <= 360 ? 26 : width <= 480 ? 28 : 30;
  const subtitleSize = width <= 360 ? 15 : 16;
  return (
    <View style={{ gap: 12, alignItems: center ? "center" : "flex-start" }}>
      {kicker ? (
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 4, textAlign: center ? "center" : "left" }}>
          {kicker}
        </Text>
      ) : null}
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: titleSize,
          fontWeight: "900",
          lineHeight: Math.round(titleSize * 1.18),
          textAlign: center ? "center" : "left"
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.textSecondary, fontSize: subtitleSize, lineHeight: Math.round(subtitleSize * 1.55), textAlign: center ? "center" : "left" }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ChoicePill({
  label,
  selected,
  onPress
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: selected ? colors.gradientEnd : colors.surfaceStrong,
        borderColor: selected ? colors.primaryLight : colors.border,
        borderRadius: radii.pill,
        borderWidth: 1.25,
        boxShadow: selected ? `0 10px 24px ${colors.shadowStrong}` : `0 8px 18px ${colors.shadow}`,
        justifyContent: "center",
        minHeight: 46,
        minWidth: 0,
        paddingHorizontal: 14,
        paddingVertical: 10
      }}
    >
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.84}
        numberOfLines={2}
        style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 18, textAlign: "center" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ScalePicker({
  label,
  max = 5,
  value,
  onChange
}: {
  label: string;
  max?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const gap = width < 520 ? 3 : 6;
  const availableWidth = Math.max(280, width - (width <= 360 ? 32 : width < 768 ? 48 : 64));
  const buttonSize = Math.max(26, Math.min(42, Math.floor((availableWidth - gap * (max - 1)) / max)));
  const numberSize = Math.max(12, Math.min(15, Math.floor(buttonSize * 0.38)));
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600", lineHeight: 18 }}>
        {label}: {value}
      </Text>
      <View style={{ alignSelf: "stretch", flexDirection: "row", flexWrap: "nowrap", gap, justifyContent: "center", width: "100%" }}>
        {Array.from({ length: max }, (_, index) => index + 1).map((number) => (
          <Pressable
            key={number}
            accessibilityRole="button"
            onPress={() => onChange(number)}
            style={{
              alignItems: "center",
              backgroundColor: value === number ? colors.gradientEnd : colors.surfaceStrong,
              borderColor: value === number ? colors.primaryLight : colors.border,
              borderRadius: 999,
              borderWidth: 1.25,
              boxShadow: value === number ? `0 8px 20px ${colors.shadowStrong}` : `0 6px 16px ${colors.shadow}`,
              height: buttonSize,
              justifyContent: "center",
              minWidth: buttonSize,
              flexShrink: 1,
              width: buttonSize
            }}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={{
                color: colors.textPrimary,
                fontSize: numberSize,
                fontWeight: "800",
                fontVariant: ["tabular-nums"],
                lineHeight: Math.max(14, numberSize + 2)
              }}
            >
              {number}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function QuietPanel({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 20,
        borderWidth: 1,
        gap: 12,
        padding: 18,
        boxShadow: `0 12px 26px ${colors.shadow}`
      }}
    >
      {children}
    </View>
  );
}
