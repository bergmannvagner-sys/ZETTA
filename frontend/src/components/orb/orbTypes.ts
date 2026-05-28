import { GestureResponderEvent } from "react-native";

export type OrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "crisis"
  | "low_energy"
  | "error"
  | "silent_presence";

export type AnimatedOrbProps = {
  state: OrbState;
  audioLevel?: number;
  size?: number;
  reducedMotion?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
};

export type OrbMotionProfile = {
  breathScale: number;
  pulseScale: number;
  durationMs: number;
  drift: number;
  glowOpacity: number;
  audioInfluence: number;
};
