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

type OrbVisual = {
  glow: string;
  ring: string;
  quiet: boolean;
};

const STATE_VISUALS: Partial<Record<OrbState, OrbVisual>> = {
  idle: { glow: "#8B5CF6", quiet: false, ring: "#C4B5FD" },
  listening: { glow: "#7C3AED", quiet: false, ring: "#A78BFA" },
  thinking: { glow: "#8B5CF6", quiet: false, ring: "#C4B5FD" },
  speaking: { glow: "#A855F7", quiet: false, ring: "#E9D5FF" },
  breathing: { glow: "#6D28D9", quiet: true, ring: "#A78BFA" },
  calm: { glow: "#8B5CF6", quiet: true, ring: "#C4B5FD" },
  silent_presence: { glow: "#C4B5FD", quiet: true, ring: "#E9D5FF" },
  low_energy: { glow: "#7C3AED", quiet: true, ring: "#DDD6FE" },
  sos: { glow: "#9333EA", quiet: true, ring: "#C084FC" },
  crisis: { glow: "#7E22CE", quiet: true, ring: "#E879F9" },
  error: { glow: "#6D28D9", quiet: true, ring: "#F5D0FE" }
};

function getVisual(state: OrbState): OrbVisual {
  return STATE_VISUALS[state] ?? { glow: "#8B5CF6", quiet: false, ring: "#C4B5FD" };
}

type OrbPalette = {
  shell: string;
  core: string;
  halo: string;
  wave: string;
};

const ORB_SPARKLES = [
  { cx: 36, cy: 68, opacity: 0.52, r: 1.4 },
  { cx: 58, cy: 44, opacity: 0.22, r: 1.2 },
  { cx: 84, cy: 30, opacity: 0.35, r: 1.15 },
  { cx: 126, cy: 22, opacity: 0.22, r: 1.25 },
  { cx: 170, cy: 28, opacity: 0.26, r: 1.05 },
  { cx: 198, cy: 40, opacity: 0.3, r: 1.3 },
  { cx: 218, cy: 68, opacity: 0.45, r: 1.5 },
  { cx: 42, cy: 116, opacity: 0.14, r: 1.1 },
  { cx: 206, cy: 112, opacity: 0.16, r: 1.1 },
  { cx: 68, cy: 186, opacity: 0.12, r: 1.2 }
] as const;

function OrbSurface({ palette, visual }: { palette: OrbPalette; visual: OrbVisual }) {
  return (
    <Svg height="100%" viewBox="0 0 256 256" width="100%">
      <Defs>
        <RadialGradient cx="50%" cy="38%" id="orbBase" r="72%">
          <Stop offset="0%" stopColor="#050816" stopOpacity="1" />
          <Stop offset="42%" stopColor="#0B1023" stopOpacity="1" />
          <Stop offset="76%" stopColor={palette.shell} stopOpacity="0.96" />
          <Stop offset="100%" stopColor={visual.glow} stopOpacity="0.94" />
        </RadialGradient>
        <RadialGradient cx="50%" cy="36%" id="orbHalo" r="66%">
          <Stop offset="0%" stopColor={palette.halo} stopOpacity="0.94" />
          <Stop offset="38%" stopColor={palette.halo} stopOpacity="0.32" />
          <Stop offset="78%" stopColor={visual.glow} stopOpacity="0.12" />
          <Stop offset="100%" stopColor="#050816" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="orbWave" x1="18%" x2="88%" y1="64%" y2="82%">
          <Stop offset="0%" stopColor={palette.wave} stopOpacity="0.96" />
          <Stop offset="48%" stopColor={visual.ring} stopOpacity="0.95" />
          <Stop offset="100%" stopColor={palette.shell} stopOpacity="0.9" />
        </LinearGradient>
        <LinearGradient id="orbShine" x1="0%" x2="100%" y1="0%" y2="100%">
          <Stop offset="0%" stopColor={palette.core} stopOpacity="0.96" />
          <Stop offset="62%" stopColor={palette.core} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={palette.core} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Circle cx="128" cy="128" fill="url(#orbBase)" r="112" />
      <Circle cx="128" cy="128" fill="url(#orbHalo)" opacity={visual.quiet ? 0.58 : 0.76} r="112" />
      <Circle cx="128" cy="128" fill="none" opacity={visual.quiet ? 0.24 : 0.4} r="108" stroke={palette.halo} strokeWidth="1.2" />
      <Path
        d="M 28 164 C 58 132, 96 118, 128 121 C 160 124, 200 138, 228 164 C 208 198, 176 220, 128 220 C 80 220, 48 198, 28 164 Z"
        fill="url(#orbWave)"
        opacity={visual.quiet ? 0.7 : 0.84}
      />
      <Path
        d="M 42 160 C 70 141, 98 134, 128 135 C 158 136, 186 144, 214 160"
        fill="none"
        opacity={visual.quiet ? 0.22 : 0.34}
        stroke={palette.core}
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <Ellipse
        cx="96"
        cy="80"
        fill="url(#orbShine)"
        opacity={visual.quiet ? 0.54 : 0.78}
        rx="46"
        ry="28"
        transform="rotate(-28 96 80)"
      />
      <Circle cx="128" cy="120" fill={palette.core} opacity="0.92" r="18" />
      <Circle cx="128" cy="120" fill={palette.core} opacity="0.12" r="32" />
      <Circle cx="128" cy="120" fill="none" opacity="0.22" r="62" stroke={palette.halo} strokeWidth="1.1" />
      {ORB_SPARKLES.map((sparkle, index) => (
        <Circle
          key={`${palette.shell}-${index}`}
          cx={sparkle.cx}
          cy={sparkle.cy}
          fill={palette.core}
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
  onPress
}: AnimatedOrbProps) {
  const { t } = useI18n();
  const visual = getVisual(state);
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

    return {
      transform: [
        { translateY: interpolate(cycle, [0, 1], [visual.quiet ? -0.7 : -3, visual.quiet ? 0.7 : 3]) },
        { translateX: visual.quiet ? 0 : interpolate(shimmerValue, [0, 1], [-2, 2]) }
      ]
    };
  });

  const haloStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.48 : breath.value;

    return {
      backgroundColor: visual.glow,
      opacity: (visual.quiet ? 0.1 : 0.2) + breathing * 0.12 + level * 0.18,
      transform: [{ scale: 0.86 + breathing * motion.breathScale * 4.4 + level * motion.audioInfluence }]
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
        { scale: 1.01 + breathing * motion.breathScale * 1.6 + level * 0.03 }
      ]
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.48 : breath.value;

    return {
      opacity: 0.3 + breathing * 0.3 + level * 0.28,
      transform: [{ scale: 0.9 + breathing * 0.14 + level * 0.18 }]
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
            ringStyle,
            {
              borderColor: palette.shell,
              borderRadius: orbSize,
              borderWidth: imageWindowSize * 0.18,
              height: orbSize * 0.98,
              opacity: visual.quiet ? 0.14 : 0.22,
              position: "absolute",
              width: orbSize * 0.98
            }
          ]}
        />
        <View
          style={{
            backgroundColor: "#050816",
            borderColor: `${visual.ring}66`,
            borderRadius: imageWindowSize / 2,
            borderWidth: 1,
            boxShadow: `0 0 ${visual.quiet ? 22 : 36}px ${visual.glow}55`,
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
            <OrbSurface palette={palette} visual={visual} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              coreStyle,
              {
                backgroundColor: palette.core,
                borderRadius: 999,
                boxShadow: `0 0 18px ${palette.core}AA`,
                height: imageWindowSize * 0.035,
                left: imageWindowSize * 0.482,
                position: "absolute",
                top: imageWindowSize * 0.39,
                width: imageWindowSize * 0.035
              }
            ]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export const AnimatedOrb = memo(AnimatedOrbComponent);
