import { useWindowDimensions, View } from "react-native";

import { EmotionalHeader } from "@/components/emotional";
import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { OrbState } from "@/components/orb/orbTypes";

type PageHeroProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  orbState?: OrbState;
  orbSize?: number;
  maxWidth?: number;
  orbOnPress?: () => void;
  orbReducedMotion?: boolean;
};

export function PageHero({
  kicker,
  title,
  subtitle,
  orbState = "calm",
  orbSize,
  maxWidth = 640,
  orbOnPress,
  orbReducedMotion
}: PageHeroProps) {
  const { width } = useWindowDimensions();
  const resolvedOrbSize = orbSize ?? Math.min(238, Math.max(176, width * 0.44));

  return (
    <View style={{ alignItems: "center", gap: 18, maxWidth, width: "100%" }}>
      <AnimatedOrb onPress={orbOnPress} reducedMotion={orbReducedMotion} state={orbState} size={resolvedOrbSize} />
      <EmotionalHeader align="center" kicker={kicker} title={title} subtitle={subtitle} />
    </View>
  );
}
