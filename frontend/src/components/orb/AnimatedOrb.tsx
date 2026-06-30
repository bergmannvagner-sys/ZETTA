import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";

import { AnimatedOrbProps, OrbMotionProfile, OrbState } from "@/components/orb/orbTypes";
import { orbAccessibilityLabelKeys, orbAccessibilityLabels, orbPalette, orbStateIndex } from "@/components/orb/orbTheme";

type OrbVisual = {
  accent: string;
  core: string;
  glow: string;
  quiet: boolean;
  ring: string;
  shell: string;
  wave: string;
};

type MotionProfile = OrbMotionProfile & {
  orbitDurationMs: number;
  shimmerDurationMs: number;
  quiet: boolean;
};

const QUIET_STATES = new Set<OrbState>([
  "breathing",
  "calm",
  "sos",
  "crisis",
  "low_energy",
  "error",
  "silent_presence"
]);

const STATE_MOTION: Record<OrbState, MotionProfile> = {
  idle: {
    audioInfluence: 0.03,
    breathScale: 1.045,
    drift: 2,
    durationMs: 3600,
    glowOpacity: 0.36,
    orbitDurationMs: 16500,
    pulseScale: 1.018,
    quiet: false,
    shimmerDurationMs: 4200
  },
  listening: {
    audioInfluence: 0.075,
    breathScale: 1.07,
    drift: 5,
    durationMs: 2100,
    glowOpacity: 0.48,
    orbitDurationMs: 9400,
    pulseScale: 1.045,
    quiet: false,
    shimmerDurationMs: 2600
  },
  thinking: {
    audioInfluence: 0.035,
    breathScale: 1.058,
    drift: 4,
    durationMs: 2800,
    glowOpacity: 0.42,
    orbitDurationMs: 11200,
    pulseScale: 1.03,
    quiet: false,
    shimmerDurationMs: 3200
  },
  speaking: {
    audioInfluence: 0.09,
    breathScale: 1.082,
    drift: 5,
    durationMs: 1850,
    glowOpacity: 0.52,
    orbitDurationMs: 8600,
    pulseScale: 1.055,
    quiet: false,
    shimmerDurationMs: 2100
  },
  breathing: {
    audioInfluence: 0.015,
    breathScale: 1.035,
    drift: 1,
    durationMs: 5200,
    glowOpacity: 0.26,
    orbitDurationMs: 21000,
    pulseScale: 1.01,
    quiet: true,
    shimmerDurationMs: 5600
  },
  calm: {
    audioInfluence: 0.015,
    breathScale: 1.03,
    drift: 1,
    durationMs: 5000,
    glowOpacity: 0.24,
    orbitDurationMs: 23000,
    pulseScale: 1.008,
    quiet: true,
    shimmerDurationMs: 5800
  },
  sos: {
    audioInfluence: 0.01,
    breathScale: 1.018,
    drift: 0,
    durationMs: 5600,
    glowOpacity: 0.2,
    orbitDurationMs: 28000,
    pulseScale: 1.004,
    quiet: true,
    shimmerDurationMs: 6200
  },
  crisis: {
    audioInfluence: 0.008,
    breathScale: 1.014,
    drift: 0,
    durationMs: 6400,
    glowOpacity: 0.18,
    orbitDurationMs: 32000,
    pulseScale: 1.003,
    quiet: true,
    shimmerDurationMs: 7200
  },
  low_energy: {
    audioInfluence: 0.01,
    breathScale: 1.02,
    drift: 0,
    durationMs: 6200,
    glowOpacity: 0.19,
    orbitDurationMs: 30000,
    pulseScale: 1.004,
    quiet: true,
    shimmerDurationMs: 7000
  },
  error: {
    audioInfluence: 0.01,
    breathScale: 1.018,
    drift: 0,
    durationMs: 5200,
    glowOpacity: 0.22,
    orbitDurationMs: 26000,
    pulseScale: 1.004,
    quiet: true,
    shimmerDurationMs: 6200
  },
  silent_presence: {
    audioInfluence: 0.01,
    breathScale: 1.018,
    drift: 0,
    durationMs: 6600,
    glowOpacity: 0.18,
    orbitDurationMs: 34000,
    pulseScale: 1.003,
    quiet: true,
    shimmerDurationMs: 7600
  },
  journaling: {
    audioInfluence: 0.02,
    breathScale: 1.04,
    drift: 2,
    durationMs: 4200,
    glowOpacity: 0.34,
    orbitDurationMs: 17800,
    pulseScale: 1.016,
    quiet: false,
    shimmerDurationMs: 4400
  },
  assistant: {
    audioInfluence: 0.045,
    breathScale: 1.058,
    drift: 3,
    durationMs: 3100,
    glowOpacity: 0.44,
    orbitDurationMs: 11800,
    pulseScale: 1.028,
    quiet: false,
    shimmerDurationMs: 3300
  }
};

function centered(size: number, containerSize: number) {
  return {
    height: size,
    left: (containerSize - size) / 2,
    top: (containerSize - size) / 2,
    width: size
  };
}

function getVisual(state: OrbState, accent: string): OrbVisual {
  const index = orbStateIndex[state];
  return {
    accent,
    core: orbPalette.core[index],
    glow: orbPalette.halo[index],
    quiet: QUIET_STATES.has(state),
    ring: orbPalette.halo[index],
    shell: orbPalette.shell[index],
    wave: orbPalette.wave[index]
  };
}

function OrbParticle({
  color,
  left,
  opacity,
  size,
  top
}: {
  color: string;
  left: number;
  opacity: number;
  size: number;
  top: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: color,
        borderRadius: size / 2,
        height: size,
        left,
        opacity,
        position: "absolute",
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.62,
        shadowRadius: 10,
        top,
        width: size
      }}
    />
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
  const { colors } = useAppTheme();
  const breath = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const resolvedSize = Math.max(156, Math.min(size, 380));
  const containerSize = resolvedSize + 64;
  const profile = STATE_MOTION[state];
  const audioBoost = Math.min(0.08, Math.max(0, audioLevel) * profile.audioInfluence);
  const visual = getVisual(
    state,
    accentOverride ??
      (state === "sos" || state === "crisis" || state === "error"
        ? colors.error
        : state === "low_energy"
          ? colors.warning
          : state === "listening" || state === "journaling"
            ? colors.info
            : colors.primary)
  );

  useEffect(() => {
    if (reducedMotion) {
      breath.setValue(0.35);
      orbit.setValue(0);
      shimmer.setValue(0.25);
      return;
    }

    breath.setValue(0);
    orbit.setValue(0);
    shimmer.setValue(0);

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          duration: profile.durationMs,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(breath, {
          duration: profile.durationMs,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        duration: profile.orbitDurationMs,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true
      })
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          duration: profile.shimmerDurationMs,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          duration: profile.shimmerDurationMs,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );

    breathLoop.start();
    orbitLoop.start();
    shimmerLoop.start();

    return () => {
      breathLoop.stop();
      orbitLoop.stop();
      shimmerLoop.stop();
    };
  }, [
    breath,
    orbit,
    profile.durationMs,
    profile.orbitDurationMs,
    profile.shimmerDurationMs,
    reducedMotion,
    shimmer
  ]);

  const animation = useMemo(() => {
    const breathScale = breath.interpolate({
      inputRange: [0, 1],
      outputRange: [1, profile.breathScale + audioBoost]
    });
    const auraScale = breath.interpolate({
      inputRange: [0, 1],
      outputRange: [0.965, profile.pulseScale + audioBoost * 0.6]
    });
    const plasmaScale = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [0.985, profile.pulseScale + audioBoost * 0.5]
    });
    const glowOpacity = breath.interpolate({
      inputRange: [0, 1],
      outputRange: [profile.glowOpacity * 0.58, profile.glowOpacity]
    });
    const shimmerOpacity = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [visual.quiet ? 0.1 : 0.18, visual.quiet ? 0.18 : 0.42]
    });
    const ringOpacity = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [visual.quiet ? 0.28 : 0.44, visual.quiet ? 0.4 : 0.74]
    });
    const empathyOpacity = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [visual.quiet ? 0.1 : 0.2, visual.quiet ? 0.18 : 0.5]
    });
    const empathyScale = breath.interpolate({
      inputRange: [0, 1],
      outputRange: [0.98, profile.pulseScale + 0.025 + audioBoost * 0.45]
    });
    const drift = breath.interpolate({
      inputRange: [0, 1],
      outputRange: [-profile.drift, profile.drift]
    });
    const ringRotate = orbit.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"]
    });
    const reverseRotate = orbit.interpolate({
      inputRange: [0, 1],
      outputRange: ["360deg", "0deg"]
    });

    return {
      auraScale,
      breathScale,
      drift,
      glowOpacity,
      empathyOpacity,
      empathyScale,
      plasmaScale,
      reverseRotate,
      ringOpacity,
      ringRotate,
      shimmerOpacity
    };
  }, [audioBoost, breath, orbit, profile, shimmer, visual.quiet]);

  const labelKey = orbAccessibilityLabelKeys[state];
  const translatedLabel = t(labelKey);
  const label = translatedLabel === labelKey ? orbAccessibilityLabels[state] : translatedLabel;
  const shellSize = resolvedSize;
  const auraSize = resolvedSize + 32;
  const outerRingSize = resolvedSize * 0.94;
  const innerRingSize = resolvedSize * 0.8;
  const plasmaSize = resolvedSize * 0.72;
  const coreSize = resolvedSize * 0.18;
  const empathyWidth = resolvedSize * 0.5;
  const empathyHeight = resolvedSize * 0.28;
  const particleOrbitSize = resolvedSize * 0.98;
  const quietOpacity = visual.quiet ? 0.72 : 0.96;

  return (
    <Pressable
      accessibilityHint={onPress ? t("home.orbHint") : undefined}
      accessibilityLabel={label}
      accessibilityRole={onPress ? "button" : "image"}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: containerSize,
        opacity: pressed && onPress ? 0.92 : 1,
        transform: [{ scale: pressed && onPress ? 0.986 : 1 }]
      })}
    >
      <View
        pointerEvents="none"
        style={{
          alignItems: "center",
          height: containerSize,
          justifyContent: "center",
          width: containerSize
        }}
      >
        <Animated.View
          style={{
            ...centered(auraSize, containerSize),
            backgroundColor: visual.glow,
            borderRadius: auraSize / 2,
            opacity: animation.glowOpacity,
            position: "absolute",
            shadowColor: visual.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: visual.quiet ? 0.28 : 0.68,
            shadowRadius: visual.quiet ? 20 : 34,
            transform: [{ scale: animation.auraScale }]
          }}
        />

        <Animated.View
          style={{
            ...centered(shellSize, containerSize),
            backgroundColor: orbPalette.surface,
            borderColor: `${visual.ring}55`,
            borderRadius: shellSize / 2,
            borderWidth: 1,
            opacity: quietOpacity,
            position: "absolute",
            shadowColor: visual.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: visual.quiet ? 0.2 : 0.42,
            shadowRadius: visual.quiet ? 16 : 26,
            transform: [{ scale: animation.breathScale }, { translateY: animation.drift }]
          }}
        />

        <Animated.View
          style={{
            ...centered(outerRingSize, containerSize),
            borderColor: visual.wave,
            borderRadius: outerRingSize / 2,
            borderStyle: "dashed",
            borderWidth: 1.2,
            opacity: animation.ringOpacity,
            position: "absolute",
            transform: [{ rotate: animation.ringRotate }]
          }}
        />

        <Animated.View
          style={{
            ...centered(innerRingSize, containerSize),
            borderColor: `${visual.ring}88`,
            borderRadius: innerRingSize / 2,
            borderWidth: 1.4,
            opacity: visual.quiet ? 0.36 : 0.58,
            position: "absolute",
            transform: [{ rotate: animation.reverseRotate }, { scale: animation.plasmaScale }]
          }}
        />

        <Animated.View
          style={{
            ...centered(particleOrbitSize, containerSize),
            opacity: visual.quiet ? 0.28 : 0.78,
            position: "absolute",
            transform: [{ rotate: animation.ringRotate }]
          }}
        >
          <OrbParticle color={visual.wave} left={particleOrbitSize * 0.2} opacity={0.92} size={6} top={particleOrbitSize * 0.06} />
          <OrbParticle color={visual.ring} left={particleOrbitSize * 0.8} opacity={0.72} size={4.5} top={particleOrbitSize * 0.24} />
          <OrbParticle color={visual.core} left={particleOrbitSize * 0.66} opacity={0.64} size={4} top={particleOrbitSize * 0.82} />
          <OrbParticle color={visual.glow} left={particleOrbitSize * 0.1} opacity={0.5} size={4} top={particleOrbitSize * 0.68} />
        </Animated.View>

        <Animated.View
          style={{
            ...centered(plasmaSize, containerSize),
            backgroundColor: `${visual.shell}5E`,
            borderColor: `${visual.wave}66`,
            borderRadius: plasmaSize / 2,
            borderWidth: 1,
            opacity: visual.quiet ? 0.58 : 0.86,
            position: "absolute",
            shadowColor: visual.wave,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: visual.quiet ? 0.14 : 0.36,
            shadowRadius: 18,
            transform: [{ scale: animation.plasmaScale }]
          }}
        />

        <Animated.View
          style={{
            backgroundColor: `${visual.wave}30`,
            borderColor: `${visual.core}55`,
            borderRadius: 999,
            borderWidth: 1,
            height: empathyHeight,
            left: (containerSize - empathyWidth) / 2 - resolvedSize * 0.08,
            opacity: animation.empathyOpacity,
            position: "absolute",
            top: containerSize * 0.39,
            transform: [{ rotate: "-18deg" }, { scale: animation.empathyScale }],
            width: empathyWidth
          }}
        />

        <Animated.View
          style={{
            backgroundColor: `${visual.accent}24`,
            borderColor: `${visual.ring}44`,
            borderRadius: 999,
            borderWidth: 1,
            height: empathyHeight * 0.86,
            left: (containerSize - empathyWidth) / 2 + resolvedSize * 0.1,
            opacity: animation.empathyOpacity,
            position: "absolute",
            top: containerSize * 0.46,
            transform: [{ rotate: "16deg" }, { scale: animation.empathyScale }],
            width: empathyWidth
          }}
        />

        <Animated.View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 999,
            height: resolvedSize * 0.14,
            left: (containerSize - resolvedSize * 0.44) / 2,
            opacity: animation.shimmerOpacity,
            position: "absolute",
            top: containerSize * 0.32,
            transform: [{ rotate: "-10deg" }, { translateY: animation.drift }],
            width: resolvedSize * 0.44
          }}
        />

        <Animated.View
          style={{
            ...centered(coreSize * 1.8, containerSize),
            backgroundColor: `${visual.accent}30`,
            borderRadius: coreSize,
            opacity: visual.quiet ? 0.5 : 0.88,
            position: "absolute",
            transform: [{ scale: animation.auraScale }]
          }}
        />

        <Animated.View
          style={{
            ...centered(coreSize, containerSize),
            backgroundColor: visual.core,
            borderColor: "#FFFFFF",
            borderRadius: coreSize / 2,
            borderWidth: 1,
            opacity: visual.quiet ? 0.88 : 1,
            position: "absolute",
            shadowColor: visual.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: visual.quiet ? 0.38 : 0.88,
            shadowRadius: visual.quiet ? 8 : 16,
            transform: [{ scale: animation.breathScale }]
          }}
        />
      </View>
    </Pressable>
  );
}

export const AnimatedOrb = memo(AnimatedOrbComponent);
