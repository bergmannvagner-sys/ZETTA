import { View } from "react-native";

import { BrandLogo } from "@/components/brand-logo";
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
  const logoWidth = Math.min(220, Math.max(160, Math.round(orbSize * 0.82)));
  return (
    <View style={{ alignItems: "center", gap: 18, maxWidth, width: "100%" }}>
      <BrandLogo width={logoWidth} />
      <AnimatedOrb accent={accent} state={orbState} size={orbSize} />
      <EmotionalHeader align="center" kicker={kicker} title={title} subtitle={subtitle} />
    </View>
  );
}
