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
  const particleBox = orbSize * 0.88;

  const haloStyle = useAnimatedStyle(() => {
    const level = clampAudioLevel(audio.value);
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: state === "crisis" ? 0.16 : motion.glowOpacity * 0.86 + level * motion.audioInfluence * 0.55,
      transform: [
        {
          scale:
            1.02 +
            breathing * motion.breathScale * 0.7 +
            level * motion.audioInfluence * 0.5
        }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, haloColors)
    };
  });

  const outerRingStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity: state === "crisis" ? 0.08 : state === "silent_presence" ? 0.08 : 0.22 + flowing * 0.1,
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
      opacity: state === "crisis" || state === "low_energy" ? 0.12 : 0.18
    };
  });

  const coreAuraStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    const level = clampAudioLevel(audio.value);
    return {
      opacity: state === "crisis" ? 0.12 : 0.26 + breathing * 0.14,
      transform: [
        { scale: 0.9 + breathing * 0.18 + level * motion.audioInfluence * 0.35 }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, coreColors)
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    const level = clampAudioLevel(audio.value);
    return {
      opacity: state === "crisis" ? 0.62 : 0.9 + breathing * 0.08,
      transform: [
        { scale: 0.86 + breathing * motion.pulseScale + level * motion.audioInfluence * 0.55 }
      ],
      backgroundColor: interpolateColor(stateValue.value, inputRange, coreColors)
    };
  });

  const embraceStyle = useAnimatedStyle(() => {
    const flowing = reducedMotion ? 0.35 : shimmer.value;
    return {
      opacity: state === "crisis" ? 0.2 : state === "silent_presence" ? 0.18 : 0.86,
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
      opacity: state === "crisis" ? 0.12 : state === "silent_presence" ? 0.14 : 0.82,
      transform: [{ scale: 0.86 + breathing * 0.08 }],
      backgroundColor: "#00E5FF"
    };
  });

  const rightPulseStyle = useAnimatedStyle(() => {
    const breathing = reducedMotion ? 0.5 : breath.value;
    return {
      opacity: state === "crisis" ? 0.1 : state === "silent_presence" ? 0.12 : 0.78,
      transform: [{ scale: 0.82 + breathing * 0.07 }],
      backgroundColor: "#FF4DFF"
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
            : 0.76 + flowing * 0.14,
      transform: [{ rotate: `${interpolate(flowing, [0, 1], [-2, 2])}deg` }]
    };
  });

  const particles = Array.from({ length: 168 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = particleBox * (0.05 + Math.sqrt((index + 1) / 168) * 0.45);
    return {
      left: particleBox * 0.5 + Math.cos(angle) * radius,
      top: particleBox * 0.5 + Math.sin(angle) * radius * 0.82,
      size: 0.72 + (index % 5) * 0.24,
      color: index % 11 === 0 ? "#00E5FF" : index % 7 === 0 ? "#FF4DFF" : index % 5 === 0 ? "#8A28E2" : "#FFFFFF",
      opacity: 0.24 + (index % 7) * 0.07
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
              height: orbSize * 0.96,
              width: orbSize * 0.96
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          className="items-center justify-center rounded-full border border-white/10"
          style={[
            shellStyle,
            {
              height: orbSize * 0.82,
              width: orbSize * 0.82,
              shadowColor: "#00E5FF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: reducedMotion ? 0.08 : 0.22,
              shadowRadius: 24
            }
          ]}
        >
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full border"
            style={[
              particleStyle,
              {
                borderColor: "rgba(0, 229, 255, 0.22)",
                height: particleBox,
                width: particleBox
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
                  left: particle.left,
                  opacity: state === "crisis" ? 0.08 : particle.opacity,
                  top: particle.top,
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
                height: orbSize * 0.052,
                left: orbSize * 0.2,
                top: orbSize * 0.34,
                width: orbSize * 0.052
              }
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full"
            style={[
              rightPulseStyle,
              {
                height: orbSize * 0.05,
                right: orbSize * 0.2,
                top: orbSize * 0.34,
                width: orbSize * 0.05
              }
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute"
            style={[
              embraceStyle,
              {
                borderBottomWidth: Math.max(3, orbSize * 0.015),
                borderBottomLeftRadius: orbSize * 0.46,
                borderBottomRightRadius: orbSize * 0.46,
                bottom: orbSize * 0.28,
                height: orbSize * 0.26,
                width: orbSize * 0.68
              }
            ]}
          />
          <View
            pointerEvents="none"
            className="absolute border-b-2 border-magenta"
            style={{
              borderBottomLeftRadius: orbSize * 0.24,
              borderBottomRightRadius: orbSize * 0.24,
              bottom: orbSize * 0.292,
              height: orbSize * 0.22,
              opacity: state === "crisis" || state === "silent_presence" ? 0.08 : 0.42,
              transform: [{ translateX: orbSize * 0.12 }],
              width: orbSize * 0.42
            }}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full"
            style={[
              coreAuraStyle,
              {
                height: orbSize * 0.16,
                width: orbSize * 0.16
              }
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="rounded-full"
            style={[
              coreStyle,
              {
                height: orbSize * 0.062,
                width: orbSize * 0.062
              }
            ]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

export const AnimatedOrb = memo(AnimatedOrbComponent);
