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
  const orbSize = Math.max(144, Math.min(size, 300));
  const shellColors = orbPalette.shell;
  const coreColors = orbPalette.core;
  const haloColors = orbPalette.halo;
  const waveColors = orbPalette.wave;
  const inputRange = orbStateOrder.map((_, index) => index);

  const haloStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: motion.glowOpacity + level * motion.audioInfluence * 0.7,
      transform: [
        {
          scale:
            1.1 +
            breathing * motion.breathScale +
            level * motion.audioInfluence * 0.7
        }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, haloColors)
    };
  });

  const outerRingStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity: state === "crisis" ? 0.12 : state === "silent_presence" ? 0.08 : 0.16 + flowing * 0.08,
      transform: [{ scale: 0.98 + flowing * 0.035 }],
      borderColor: interpolateColor(stateValue.value, inputRange, waveColors)
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
      opacity: state === "crisis" || state === "low_energy" ? 0.38 : 0.52
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    const level = clampAudioLevel(audio.value);
    return {
      opacity: state === "crisis" ? 0.42 : 0.58 + breathing * 0.16,
      transform: [
        { scale: 0.62 + breathing * motion.pulseScale + level * motion.audioInfluence * 0.55 }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, coreColors)
    };
  });

  const embraceStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity: state === "crisis" ? 0.2 : state === "silent_presence" ? 0.2 : 0.72,
      transform: [
        { translateY: interpolate(flowing, [0, 1], [orbSize * 0.01, -orbSize * 0.012]) },
        { scaleX: 1 + flowing * 0.022 },
        { scaleY: 0.9 + flowing * 0.018 }
      ],
      borderColor: interpolateColor(stateValue.value, inputRange, waveColors)
    };
  });

  const leftPulseStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: state === "crisis" ? 0.2 : state === "silent_presence" ? 0.18 : 0.78,
      transform: [{ scale: 0.86 + breathing * 0.08 }],
      backgroundColor: interpolateColor(stateValue.value, inputRange, waveColors)
    };
  });

  const rightPulseStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: state === "crisis" ? 0.18 : state === "silent_presence" ? 0.16 : 0.72,
      transform: [{ scale: 0.82 + breathing * 0.07 }],
      backgroundColor: interpolateColor(stateValue.value, inputRange, waveColors)
    };
  });

  const particleStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity:
        state === "crisis"
          ? 0.06
          : state === "low_energy" || state === "silent_presence"
            ? 0.1
            : 0.18 + flowing * 0.06,
      transform: [{ rotate: `${interpolate(flowing, [0, 1], [-2, 2])}deg` }]
    };
  });

  const particles = Array.from({ length: 42 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = orbSize * (0.05 + Math.sqrt((index + 1) / 42) * 0.32);
    return {
      left: orbSize * 0.5 + Math.cos(angle) * radius,
      top: orbSize * 0.5 + Math.sin(angle) * radius * 0.82,
      size: 1.2 + (index % 4) * 0.55,
      color: index % 7 === 0 ? "#00E5FF" : index % 5 === 0 ? "#FF4DFF" : "#FFFFFF"
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
              shadowColor: state === "listening" || state === "speaking" ? "#00E5FF" : "#8A28E2",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: reducedMotion ? 0.12 : 0.28,
              shadowRadius: state === "crisis" || state === "silent_presence" ? 18 : 34
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-full border"
          style={[
            outerRingStyle,
            {
              height: orbSize * 0.9,
              width: orbSize * 0.9
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
              shadowColor: "#8A28E2",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: reducedMotion ? 0.08 : 0.2,
              shadowRadius: 20
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
                className="absolute rounded-full"
                style={{
                  backgroundColor: particle.color,
                  height: particle.size,
                  left: particle.left * 0.74,
                  opacity: state === "crisis" ? 0.12 : 0.45,
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
