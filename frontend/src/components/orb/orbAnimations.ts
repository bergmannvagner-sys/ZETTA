import { Easing } from "react-native-reanimated";

import { OrbMotionProfile, OrbState } from "@/components/orb/orbTypes";

export const orbMotionProfiles: Record<OrbState, OrbMotionProfile> = {
  idle: {
    breathScale: 0.035,
    pulseScale: 0.014,
    durationMs: 3200,
    drift: 2,
    glowOpacity: 0.3,
    audioInfluence: 0.02
  },
  listening: {
    breathScale: 0.065,
    pulseScale: 0.05,
    durationMs: 1700,
    drift: 6,
    glowOpacity: 0.48,
    audioInfluence: 0.11
  },
  thinking: {
    breathScale: 0.04,
    pulseScale: 0.026,
    durationMs: 3200,
    drift: 4,
    glowOpacity: 0.38,
    audioInfluence: 0.02
  },
  speaking: {
    breathScale: 0.055,
    pulseScale: 0.045,
    durationMs: 1500,
    drift: 6,
    glowOpacity: 0.42,
    audioInfluence: 0.08
  },
  crisis: {
    breathScale: 0.018,
    pulseScale: 0.008,
    durationMs: 3600,
    drift: 1,
    glowOpacity: 0.24,
    audioInfluence: 0
  },
  low_energy: {
    breathScale: 0.024,
    pulseScale: 0.01,
    durationMs: 4200,
    drift: 2,
    glowOpacity: 0.18,
    audioInfluence: 0
  },
  error: {
    breathScale: 0.025,
    pulseScale: 0.012,
    durationMs: 3000,
    drift: 1,
    glowOpacity: 0.2,
    audioInfluence: 0
  },
  silent_presence: {
    breathScale: 0.012,
    pulseScale: 0.004,
    durationMs: 5200,
    drift: 0.5,
    glowOpacity: 0.16,
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
