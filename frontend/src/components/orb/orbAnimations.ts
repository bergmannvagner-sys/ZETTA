import { Easing } from "react-native-reanimated";

import { OrbMotionProfile, OrbState } from "@/components/orb/orbTypes";

export const orbMotionProfiles: Record<OrbState, OrbMotionProfile> = {
  idle: {
    breathScale: 0.028,
    pulseScale: 0.012,
    durationMs: 3600,
    drift: 2,
    glowOpacity: 0.28,
    audioInfluence: 0.02
  },
  listening: {
    breathScale: 0.052,
    pulseScale: 0.04,
    durationMs: 1900,
    drift: 5,
    glowOpacity: 0.42,
    audioInfluence: 0.09
  },
  thinking: {
    breathScale: 0.035,
    pulseScale: 0.022,
    durationMs: 3400,
    drift: 3,
    glowOpacity: 0.34,
    audioInfluence: 0.02
  },
  speaking: {
    breathScale: 0.046,
    pulseScale: 0.038,
    durationMs: 1800,
    drift: 4,
    glowOpacity: 0.38,
    audioInfluence: 0.07
  },
  crisis: {
    breathScale: 0.01,
    pulseScale: 0.004,
    durationMs: 5200,
    drift: 1,
    glowOpacity: 0.16,
    audioInfluence: 0
  },
  low_energy: {
    breathScale: 0.018,
    pulseScale: 0.006,
    durationMs: 5600,
    drift: 1,
    glowOpacity: 0.16,
    audioInfluence: 0
  },
  error: {
    breathScale: 0.018,
    pulseScale: 0.006,
    durationMs: 4200,
    drift: 1,
    glowOpacity: 0.18,
    audioInfluence: 0
  },
  silent_presence: {
    breathScale: 0.006,
    pulseScale: 0.002,
    durationMs: 7200,
    drift: 0.3,
    glowOpacity: 0.12,
    audioInfluence: 0
  }
};

export const calmEasing = Easing.inOut(Easing.ease);

export function clampAudioLevel(audioLevel?: number): number {
  "worklet";
  if (audioLevel === undefined || Number.isNaN(audioLevel)) {
    return 0;
  }
  return Math.min(1, Math.max(0, audioLevel));
}
