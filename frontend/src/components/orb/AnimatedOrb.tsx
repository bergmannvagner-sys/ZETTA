import { memo, useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop, Svg } from "react-native-svg";

import { calmEasing, clampAudioLevel } from "@/components/orb/orbAnimations";
import { AnimatedOrbProps, OrbState } from "@/components/orb/orbTypes";
import { orbAccessibilityLabelKeys, orbAccessibilityLabels, orbPalette, orbStateIndex } from "@/components/orb/orbTheme";
import { useOrbState } from "@/components/orb/useOrbState";
import { useI18n } from "@/i18n/i18n";
import { useAppTheme } from "@/design-system/theme";

type OrbVisual = {
  glow: string;
  ring: string;
  quiet: boolean;
};

type Sparkle = {
  cx: number;
  cy: number;
  opacity: number;
  r: number;
  accent?: boolean;
};

const STATE_VISUALS: Partial<Record<OrbState, OrbVisual>> = {
  idle: { glow: "#7C3AED", quiet: false, ring: "#DDD6FE" },
  listening: { glow: "#0EA5A4", quiet: false, ring: "#A5F3FC" },
  thinking: { glow: "#3B82F6", quiet: false, ring: "#BFDBFE" },
  speaking: { glow: "#EC4899", quiet: false, ring: "#FBCFE8" },
  breathing: { glow: "#14B8A6", quiet: true, ring: "#99F6E4" },
  calm: { glow: "#8B5CF6", quiet: true, ring: "#E9D5FF" },
  silent_presence: { glow: "#6366F1", quiet: true, ring: "#C7D2FE" },
  low_energy: { glow: "#84CC16", quiet: true, ring: "#D9F99D" },
  sos: { glow: "#F59E0B", quiet: true, ring: "#FDE68A" },
  crisis: { glow: "#EF4444", quiet: true, ring: "#FCA5A5" },
  error: { glow: "#F43F5E", quiet: true, ring: "#FDA4AF" }
};

function getVisual(state: OrbState): OrbVisual {
  return STATE_VISUALS[state] ?? { glow: "#7C3AED", quiet: false, ring: "#DDD6FE" };
}

type OrbPalette = {
  shell: string;
  core: string;
  halo: string;
  wave: string;
};

function OrbSurface({ palette, visual, accent }: { palette: OrbPalette; visual: OrbVisual; accent: string }) {
  const sparkles: Sparkle[] = [
    { accent: true, cx: 42, cy: 66, opacity: 0.5, r: 1.38 },
    { cx: 64, cy: 44, opacity: 0.26, r: 1.16 },
    { accent: true, cx: 86, cy: 30, opacity: 0.34, r: 1.08 },
    { cx: 112, cy: 24, opacity: 0.4, r: 1.22 },
    { accent: true, cx: 132, cy: 22, opacity: 0.36, r: 1.08 },
    { cx: 158, cy: 30, opacity: 0.28, r: 1.02 }
  ];
  const mirroredSparkles: Sparkle[] = [];
  for (const sparkle of sparkles) {
    mirroredSparkles.push(sparkle);
    if (sparkle.cx !== 128) {
      mirroredSparkles.push({ ...sparkle, cx: 256 - sparkle.cx });
    }
  }

  return (
    <Svg height="100%" viewBox="0 0 256 256" width="100%">
      <Defs>
        <RadialGradient cx="50%" cy="38%" id="orbBase" r="72%">
          <Stop offset="0%" stopColor={accent} stopOpacity="0.78" />
          <Stop offset="42%" stopColor="#22153B" stopOpacity="1" />
          <Stop offset="76%" stopColor={palette.shell} stopOpacity="0.94" />
          <Stop offset="100%" stopColor={visual.glow} stopOpacity="0.96" />
        </RadialGradient>
        <RadialGradient cx="50%" cy="36%" id="orbHalo" r="66%">
          <Stop offset="0%" stopColor={palette.halo} stopOpacity="0.9" />
          <Stop offset="42%" stopColor={palette.halo} stopOpacity="0.34" />
          <Stop offset="78%" stopColor={visual.glow} stopOpacity="0.14" />
          <Stop offset="100%" stopColor="#050816" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="orbWave" x1="18%" x2="82%" y1="64%" y2="82%">
          <Stop offset="0%" stopColor={palette.wave} stopOpacity="0.96" />
          <Stop offset="48%" stopColor={visual.ring} stopOpacity="0.95" />
          <Stop offset="100%" stopColor={palette.shell} stopOpacity="0.9" />
        </LinearGradient>
        <LinearGradient id="orbShine" x1="0%" x2="100%" y1="0%" y2="100%">
          <Stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <Stop offset="62%" stopColor={palette.core} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={palette.core} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx="128" cy="128" fill="url(#orbBase)" r="112" />
      <Circle cx="128" cy="128" fill="url(#orbHalo)" opacity={visual.quiet ? 0.58 : 0.76} r="112" />
      <Circle cx="128" cy="128" fill="none" opacity={visual.quiet ? 0.24 : 0.4} r="108" stroke={palette.halo} strokeWidth="1.2" />
      <Path
        d="M 34 160 C 60 132, 92 118, 128 120 C 164 118, 196 132, 222 160 C 206 198, 174 220, 128 220 C 82 220, 50 198, 34 160 Z"
        fill="url(#orbWave)"
        opacity={visual.quiet ? 0.7 : 0.84}
      />
      <Path
        d="M 52 156 C 74 142, 100 136, 128 136 C 156 136, 182 142, 204 156"
        fill="none"
        opacity={visual.quiet ? 0.22 : 0.34}
        stroke={palette.core}
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <Ellipse
        cx="128"
        cy="82"
        fill="url(#orbShine)"
        opacity={visual.quiet ? 0.54 : 0.78}
        rx="54"
        ry="32"
        transform="rotate(-8 128 82)"
      />
      <Circle cx="128" cy="122" fill={accent} opacity="0.92" r="18" />
      <Circle cx="128" cy="122" fill={palette.core} opacity="0.12" r="34" />
      <Circle cx="128" cy="122" fill="none" opacity="0.22" r="64" stroke={palette.halo} strokeWidth="1.1" />
      {mirroredSparkles.map((sparkle, index) => (
        <Circle
          key={`${palette.shell}-${index}`}
          cx={sparkle.cx}
          cy={sparkle.cy}
          fill={sparkle.accent ? accent : palette.core}
          opacity={sparkle.opacity * (visual.quiet ? 0.7 : 1)}
          r={sparkle.r}
        />
      ))}
    </Svg>
  );
}

function AnimatedOrbComponent({
  state,
  audioLevel = 0,
  size = 220,
  reducedMotion = false,
  accent: accentOverride,
  onPress
}: AnimatedOrbProps) {
  const { t } = useI18n();
  const visual = getVisual(state);
  const { colors: themeColors } = useAppTheme();
  const accent =
    accentOverride ??
    (state === "sos" || state === "crisis" || state === "error"
      ? themeColors.error
      : state === "low_energy"
        ? themeColors.warning
        : state === "listening" || state === "speaking"
          ? themeColors.primary
          : themeColors.primaryDark);
  const paletteIndex = orbStateIndex[state];
  const palette: OrbPalette = {
    shell: orbPalette.shell[paletteIndex],
    core: orbPalette.core[paletteIndex],
    halo: orbPalette.halo[paletteIndex],
    wave: orbPalette.wave[paletteIndex]
  };
  const orbSize = Math.max(156, Math.min(size, 380));
  const imageWindowSize = orbSize * 0.82;
  const { audio, breath, motion, shimmer } = useOrbState(state, audioLevel, reducedMotion);
  const livingCycle = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(livingCycle);

    if (reducedMotion) {
      livingCycle.value = 0.42;
      return;
    }

    livingCycle.value = withRepeat(
      withTiming(1, { duration: visual.quiet ? 9200 : 5600, easing: calmEasing }),
      -1,
      true
    );

    return () => {
      cancelAnimation(livingCycle);
    };
  }, [livingCycle, reducedMotion, visual.quiet]);

  const presenceStyle = useAnimatedStyle(() => {
    const cycle = reducedMotion ? 0.42 : livingCycle.value;
    const shimmerValue = reducedMotion ? 0.5 : shimmer.value;
    const drift = visual.quiet ? 0 : motion.drift;
    const pulse = interpolate(cycle, [0, 1], [1 - motion.pulseScale * 0.5, 1 + motion.pulseScale * 0.5]);

    return {
      transform: [
        { translateY: interpolate(cycle, [0, 1], [visual.quiet ? -0.7 : -3 - drift * 0.35, visual.quiet ? 0.7 : 3 + drift * 0.35]) },
        { translateX: visual.quiet ? 0 : interpolate(shimmerValue, [0, 1], [-drift, drift]) },
        { scale: pulse }
      ]
    };
  });

  const haloStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.48 : breath.value;
    const cycle = reducedMotion ? 0.42 : livingCycle.value;

    return {
      backgroundColor: accent,
      opacity: (visual.quiet ? 0.08 : 0.16) + motion.glowOpacity * 0.24 + breathing * 0.1 + level * 0.14,
      transform: [
        {
          scale:
            0.86 +
            breathing * motion.breathScale * 4.4 +
            level * motion.audioInfluence +
            interpolate(cycle, [0, 1], [-motion.pulseScale * 0.2, motion.pulseScale * 0.2])
        }
      ]
    };
  });

  const accentRingStyle = useAnimatedStyle(() => {
    const cycle = reducedMotion ? 0.38 : livingCycle.value;
    const breathing = reducedMotion ? 0.48 : breath.value;
    const level = clampAudioLevel(audio.value);

    return {
      borderColor: accent,
      opacity: (visual.quiet ? 0.14 : 0.24) + cycle * 0.12 + breathing * 0.08 + level * 0.08,
      transform: [{ scale: 0.9 + cycle * motion.pulseScale * 2.2 + breathing * 0.018 }]
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const cycle = reducedMotion ? 0.38 : livingCycle.value;
    const shimmerValue = reducedMotion ? 0.5 : shimmer.value;

    return {
      borderColor: visual.ring,
      opacity: visual.quiet ? 0.32 : 0.5 + cycle * 0.18,
      transform: [
        { rotate: `${interpolate(shimmerValue, [0, 1], [-6, 6])}deg` },
        { scale: 0.94 + cycle * 0.045 }
      ]
    };
  });

  const imageStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.48 : breath.value;
    const cycle = reducedMotion ? 0.42 : livingCycle.value;

    return {
      transform: [
        { translateY: interpolate(cycle, [0, 1], [-2, 2]) },
        { translateX: visual.quiet ? 0 : interpolate(shimmer.value, [0, 1], [-1.5, 1.5]) },
        { scale: 1.01 + breathing * motion.breathScale * 1.6 + level * 0.03 + interpolate(cycle, [0, 1], [-motion.pulseScale * 0.18, motion.pulseScale * 0.18]) }
      ]
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.48 : breath.value;

    return {
      opacity: 0.3 + breathing * 0.3 + level * 0.28,
      transform: [{ scale: 0.9 + breathing * 0.14 + level * 0.18 + interpolate(reducedMotion ? 0.42 : livingCycle.value, [0, 1], [-motion.pulseScale * 0.06, motion.pulseScale * 0.06]) }]
    };
  });

  return (
    <Pressable
      accessibilityLabel={t(orbAccessibilityLabelKeys[state]) ?? orbAccessibilityLabels[state]}
      accessibilityRole={onPress ? "button" : "image"}
      className="items-center justify-center"
      disabled={!onPress}
      onPress={onPress}
      style={{ minHeight: orbSize + 30 }}
    >
      <Animated.View
        className="items-center justify-center"
        style={[presenceStyle, { height: orbSize + 30, width: orbSize + 30 }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            haloStyle,
            {
              borderRadius: orbSize,
              height: orbSize,
              position: "absolute",
              width: orbSize
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            ringStyle,
            {
              borderRadius: orbSize,
              borderWidth: 1.2,
              height: orbSize * 0.94,
              position: "absolute",
              width: orbSize * 0.94
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            accentRingStyle,
            {
              borderRadius: orbSize,
              borderWidth: 1.1,
              height: orbSize * 0.9,
              position: "absolute",
              width: orbSize * 0.9
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            ringStyle,
            {
              borderColor: palette.shell,
              borderRadius: orbSize,
              borderWidth: imageWindowSize * 0.16,
              height: orbSize * 0.98,
              opacity: visual.quiet ? 0.14 : 0.22,
              position: "absolute",
              width: orbSize * 0.98
            }
          ]}
        />
        <View
          style={{
            backgroundColor: "#1A1030",
            borderColor: `${accent}66`,
            borderRadius: imageWindowSize / 2,
            borderWidth: 1,
            boxShadow: `0 0 ${visual.quiet ? 22 : 36}px ${accent}55`,
            height: imageWindowSize,
            overflow: "hidden",
            width: imageWindowSize
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              imageStyle,
              {
                height: imageWindowSize,
                position: "absolute",
                width: imageWindowSize
              }
            ]}
          >
            <OrbSurface palette={palette} visual={visual} accent={accent} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              coreStyle,
              {
                backgroundColor: accent,
                borderRadius: 999,
                boxShadow: `0 0 18px ${accent}AA`,
                height: imageWindowSize * 0.032,
                left: imageWindowSize * 0.484,
                position: "absolute",
                top: imageWindowSize * 0.41,
                width: imageWindowSize * 0.032
              }
            ]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export const AnimatedOrb = memo(AnimatedOrbComponent);
