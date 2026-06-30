import { View } from "react-native";

import { EmotionalHeader } from "@/components/emotional";
import { AnimatedOrb } from "@/components/orb/AnimatedOrb";
import { OrbState } from "@/components/orb/orbTypes";

type AuthHeroProps = {
  kicker: string;
  title: string;
  subtitle?: string;
  orbState?: OrbState;
  orbSize?: number;
  maxWidth?: number;
  accent?: string;
};

export function AuthHero({
  kicker,
  title,
  subtitle,
  orbState = "idle",
  orbSize = 220,
  maxWidth = 620,
  accent
}: AuthHeroProps) {
  return (
    <View style={{ alignItems: "center", gap: 18, maxWidth, width: "100%" }}>
      <AnimatedOrb accent={accent} state={orbState} size={orbSize} />
      <EmotionalHeader align="center" kicker={kicker} title={title} subtitle={subtitle} />
    </View>
  );
}
