import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

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
  const center = align === "center";
  return (
    <View className={`gap-3 ${center ? "items-center" : ""}`}>
      {kicker ? <Text className={`text-xs font-semibold text-primary ${center ? "text-center" : ""}`}>{kicker}</Text> : null}
      <Text className={`text-3xl font-semibold leading-10 text-ink dark:text-white ${center ? "text-center" : ""}`}>{title}</Text>
      {subtitle ? (
        <Text className={`text-base leading-7 text-muted dark:text-[#D1D5DB] ${center ? "text-center" : ""}`}>{subtitle}</Text>
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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`rounded-full border px-4 py-3 ${
        selected ? "border-violet bg-violet" : "border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceStrong dark:bg-[#1C1630]/70"
      }`}
    >
      <Text className="font-semibold text-ink dark:text-white">{label}</Text>
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
  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-muted dark:text-[#D1D5DB]">{label}: {value}</Text>
      <View className="flex-row flex-wrap gap-2">
        {Array.from({ length: max }, (_, index) => index + 1).map((number) => (
          <Pressable
            key={number}
            accessibilityRole="button"
            onPress={() => onChange(number)}
            className={`h-10 w-10 items-center justify-center rounded-full border ${
              value === number ? "border-violet bg-violet" : "border-primaryLight dark:border-[#4C1D95]/40 bg-surfaceStrong dark:bg-[#1C1630]/70"
            }`}
          >
            <Text className="font-semibold text-ink dark:text-white">{number}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function QuietPanel({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-2xl border border-primaryLight dark:border-[#4C1D95]/10 bg-surface dark:bg-[#1C1630]/50 p-5">{children}</View>;
}
