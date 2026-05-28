import { memo } from "react";
import { Pressable, View } from "react-native";
import Animated, { interpolate, interpolateColor, useAnimatedStyle } from "react-native-reanimated";

import { clampAudioLevel } from "@/components/orb/orbAnimations";
import { AnimatedOrbProps } from "@/components/orb/orbTypes";
import { useOrbState } from "@/components/orb/useOrbState";
import { orbAccessibilityLabels, orbPalette, orbStateOrder } from "@/components/orb/orbTheme";

function AnimatedOrbComponent({
  state,
  audioLevel = 0,
  size = 220,
  reducedMotion = false,
  onPress
}: AnimatedOrbProps) {
  const { audio, breath, motion, shimmer, stateValue } = useOrbState(state, audioLevel, reducedMotion);
  const orbSize = Math.max(144, Math.min(size, 280));
  const shellColors = orbPalette.shell;
  const coreColors = orbPalette.core;
  const haloColors = orbPalette.halo;
  const waveColors = orbPalette.wave;
  const inputRange = orbStateOrder.map((_, index) => index);

  const haloStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: motion.glowOpacity + level * motion.audioInfluence,
      transform: [
        {
          scale:
            1.08 +
            breathing * motion.breathScale +
            level * motion.audioInfluence
        }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, haloColors)
    };
  });

  const shellStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.5 : breath.value;
    const audioPush = level * motion.audioInfluence;
    return {
      transform: [
        { translateY: interpolate(breathing, [0, 1], [-motion.drift, motion.drift]) },
        { scale: 0.98 + breathing * motion.breathScale + audioPush }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, shellColors),
      opacity: state === "crisis" || state === "low_energy" ? 0.42 : 0.54
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    const level = clampAudioLevel(audio.value);
    return {
      opacity: 0.56 + breathing * 0.2,
      transform: [
        { scale: 0.62 + breathing * motion.pulseScale + level * motion.audioInfluence * 0.7 }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, coreColors)
    };
  });

  const flowStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity: state === "silent_presence" ? 0.08 : 0.16 + flowing * 0.14,
      transform: [
        { rotate: `${interpolate(flowing, [0, 1], [-10, 10])}deg` },
        { scaleX: 0.52 + flowing * 0.14 },
        { scaleY: 0.9 + flowing * 0.08 }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, coreColors)
    };
  });

  const embraceStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity: state === "crisis" ? 0.42 : state === "silent_presence" ? 0.32 : 0.68,
      transform: [
        { translateY: interpolate(flowing, [0, 1], [orbSize * 0.018, -orbSize * 0.018]) },
        { scaleX: 1 + flowing * 0.025 },
        { scaleY: 0.92 + flowing * 0.02 }
      ],
      borderColor: interpolateColor(stateValue.value, inputRange, waveColors)
    };
  });

  const leftPulseStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: state === "silent_presence" ? 0.28 : 0.7,
      transform: [{ scale: 0.86 + breathing * 0.08 }],
      backgroundColor: interpolateColor(stateValue.value, inputRange, waveColors)
    };
  });

  const rightPulseStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: state === "silent_presence" ? 0.26 : 0.62,
      transform: [{ scale: 0.82 + breathing * 0.07 }],
      backgroundColor: interpolateColor(stateValue.value, inputRange, coreColors)
    };
  });

  const particleStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity: state === "low_energy" || state === "silent_presence" ? 0.14 : 0.24 + flowing * 0.08,
      transform: [{ rotate: `${interpolate(flowing, [0, 1], [-3, 3])}deg` }]
    };
  });

  const particles = Array.from({ length: 22 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 22;
    const radius = orbSize * (0.29 + (index % 4) * 0.03);
    return {
      left: orbSize * 0.5 + Math.cos(angle) * radius,
      top: orbSize * 0.5 + Math.sin(angle) * radius,
      size: 2 + (index % 3)
    };
  });

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={orbAccessibilityLabels[state]}
      onPress={onPress}
      disabled={!onPress}
      className="items-center justify-center"
      style={{ minHeight: orbSize + 32 }}
    >
      <View
        className="items-center justify-center"
        style={{
          height: orbSize + 28,
          width: orbSize + 28
        }}
      >
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-full"
          style={[
            haloStyle,
            {
              height: orbSize,
              width: orbSize,
              shadowColor: "#75D8F2",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: reducedMotion ? 0.18 : 0.34,
              shadowRadius: 32
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          className="items-center justify-center rounded-full border border-white/10"
          style={[
            shellStyle,
            {
              height: orbSize * 0.78,
              width: orbSize * 0.78,
              shadowColor: "#8EA6FF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: reducedMotion ? 0.12 : 0.24,
              shadowRadius: 18
            }
          ]}
        >
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full border border-white/20"
            style={[
              particleStyle,
              {
                height: orbSize * 0.74,
                width: orbSize * 0.74
              }
            ]}
          >
            {particles.map((particle, index) => (
              <View
                key={index}
                className="absolute rounded-full bg-white"
                style={{
                  height: particle.size,
                  left: particle.left * 0.74,
                  opacity: 0.54,
                  top: particle.top * 0.74,
                  width: particle.size
                }}
              />
            ))}
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full"
            style={[
              leftPulseStyle,
              {
                height: orbSize * 0.08,
                left: orbSize * 0.18,
                top: orbSize * 0.28,
                width: orbSize * 0.08
              }
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full"
            style={[
              rightPulseStyle,
              {
                height: orbSize * 0.08,
                right: orbSize * 0.18,
                top: orbSize * 0.28,
                width: orbSize * 0.08
              }
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute border-b-4"
            style={[
              embraceStyle,
              {
                borderBottomLeftRadius: orbSize * 0.38,
                borderBottomRightRadius: orbSize * 0.38,
                bottom: orbSize * 0.19,
                height: orbSize * 0.28,
                width: orbSize * 0.62
              }
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full"
            style={[
              flowStyle,
              {
                height: orbSize * 0.6,
                width: orbSize * 0.36
              }
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="rounded-full"
            style={[
              coreStyle,
              {
                height: orbSize * 0.38,
                width: orbSize * 0.38
              }
            ]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

export const AnimatedOrb = memo(AnimatedOrbComponent);
