import { useEffect, useMemo } from "react";
import { cancelAnimation, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { calmEasing, clampAudioLevel, orbMotionProfiles } from "@/components/orb/orbAnimations";
import { OrbState } from "@/components/orb/orbTypes";
import { orbStateIndex } from "@/components/orb/orbTheme";

export function useOrbState(state: OrbState, audioLevel = 0, reducedMotion = false) {
  const breath = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const stateValue = useSharedValue(orbStateIndex[state]);
  const audio = useSharedValue(clampAudioLevel(audioLevel));

  const motion = useMemo(() => orbMotionProfiles[state], [state]);

  useEffect(() => {
    stateValue.value = withTiming(orbStateIndex[state], {
      duration: reducedMotion ? 0 : 520,
      easing: calmEasing
    });
  }, [reducedMotion, state, stateValue]);

  useEffect(() => {
    audio.value = withTiming(clampAudioLevel(audioLevel), {
      duration: reducedMotion ? 0 : 140,
      easing: calmEasing
    });
  }, [audio, audioLevel, reducedMotion]);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(shimmer);

    if (reducedMotion) {
      breath.value = 0.5;
      shimmer.value = 0.35;
      return;
    }

    breath.value = withRepeat(
      withTiming(1, { duration: motion.durationMs, easing: calmEasing }),
      -1,
      true
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: motion.durationMs * 1.6, easing: calmEasing }),
      -1,
      true
    );
  }, [breath, motion.durationMs, reducedMotion, shimmer]);

  return {
    audio,
    breath,
    motion,
    shimmer,
    stateValue
  };
}
