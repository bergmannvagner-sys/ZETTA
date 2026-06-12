import { useWindowDimensions, View } from "react-native";

import { EmotionalHeader } from "@/components/emotional";
import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { OrbState } from "@/components/orb/orbTypes";
import { useAppTheme } from "@/design-system/theme";

type PageHeroProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  orbState?: OrbState;
  orbSize?: number;
  maxWidth?: number;
  orbOnPress?: () => void;
  orbReducedMotion?: boolean;
  accent?: string;
};

export function PageHero({
  kicker,
  title,
  subtitle,
  orbState = "calm",
  orbSize,
  maxWidth = 640,
  orbOnPress,
  orbReducedMotion,
  accent
}: PageHeroProps) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const resolvedOrbSize = orbSize ?? Math.min(238, Math.max(176, width * 0.44));
  const resolvedAccent =
    accent ??
    (orbState === "sos"
      ? colors.warning
      : orbState === "crisis"
        ? colors.error
        : orbState === "error"
          ? colors.error
          : orbState === "low_energy"
            ? colors.success
            : orbState === "listening"
              ? colors.info
              : orbState === "speaking"
                ? colors.primary
                : orbState === "thinking"
                  ? colors.primaryDark
                  : orbState === "breathing"
                    ? colors.primaryDark
                    : orbState === "silent_presence"
                      ? colors.info
                      : colors.primary);

  return (
    <View style={{ alignItems: "center", gap: 18, maxWidth, width: "100%" }}>
      <AnimatedOrb
        accent={resolvedAccent}
        onPress={orbOnPress}
        reducedMotion={orbReducedMotion}
        state={orbState}
        size={resolvedOrbSize}
      />
      <EmotionalHeader align="center" kicker={kicker} title={title} subtitle={subtitle} />
    </View>
  );
}
