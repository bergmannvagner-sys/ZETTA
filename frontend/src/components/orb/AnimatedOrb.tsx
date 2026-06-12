import { memo } from "react";
import { Pressable, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";
import { useI18n } from "@/i18n/i18n";

import { AnimatedOrbProps, OrbState } from "@/components/orb/orbTypes";
import { orbAccessibilityLabelKeys, orbAccessibilityLabels, orbPalette, orbStateIndex } from "@/components/orb/orbTheme";

type OrbVisual = {
  accent: string;
  core: string;
  quiet: boolean;
  ring: string;
  shell: string;
  glow: string;
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

function getVisual(state: OrbState, accent: string): OrbVisual {
  const index = orbStateIndex[state];
  return {
    accent,
    core: orbPalette.core[index],
    glow: orbPalette.halo[index],
    quiet: QUIET_STATES.has(state),
    ring: orbPalette.halo[index],
    shell: orbPalette.shell[index]
  };
}

type OrbLayerProps = {
  backgroundColor: string;
  borderColor?: string;
  borderWidth?: number;
  height: number;
  opacity?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  top?: number;
  left?: number;
  width: number;
  zIndex?: number;
  radius?: number;
};

function OrbLayer({
  backgroundColor,
  borderColor,
  borderWidth = 0,
  height,
  opacity = 1,
  shadowColor,
  shadowOpacity = 0,
  shadowRadius = 0,
  top = 0,
  left = 0,
  width,
  zIndex = 0,
  radius
}: OrbLayerProps) {
  const borderRadius = radius ?? Math.round(Math.min(height, width) / 2);
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor,
        borderColor,
        borderRadius,
        borderWidth,
        height,
        left,
        opacity,
        position: "absolute",
        shadowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity,
        shadowRadius,
        top,
        width,
        zIndex
      }}
    />
  );
}

function OrbSpark({ accent, left, top, size, opacity }: { accent: string; left: number; top: number; size: number; opacity: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: accent,
        borderRadius: size / 2,
        height: size,
        left,
        opacity,
        position: "absolute",
        shadowColor: accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
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
  const resolvedSize = Math.max(156, Math.min(size, 380));
  const visual = getVisual(
    state,
    accentOverride ??
      (state === "sos" || state === "crisis" || state === "error"
        ? colors.error
        : state === "low_energy"
          ? colors.warning
          : state === "listening" || state === "speaking"
            ? colors.primary
            : colors.primary)
  );
  const auraSize = resolvedSize + 30;
  const shellSize = resolvedSize * 0.98;
  const ringSize = resolvedSize * 0.9;
  const innerSize = resolvedSize * 0.74;
  const coreSize = Math.max(16, resolvedSize * 0.14);
  const highlightWidth = resolvedSize * 0.46;
  const highlightHeight = resolvedSize * 0.18;
  const shimmerOpacity = reducedMotion ? 0.18 : 0.3 + Math.min(0.12, Math.max(0, audioLevel) * 0.12);
  const glowOpacity = reducedMotion ? 0.16 : visual.quiet ? 0.24 : 0.38;
  const label = t(orbAccessibilityLabelKeys[state]) ?? orbAccessibilityLabels[state];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={onPress ? "button" : "image"}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: auraSize,
        opacity: pressed && onPress ? 0.92 : 1,
        transform: [{ scale: pressed && onPress ? 0.986 : 1 }]
      })}
    >
      <View
        style={{
          alignItems: "center",
          height: auraSize,
          justifyContent: "center",
          width: auraSize
        }}
      >
        <OrbLayer
          backgroundColor={visual.glow}
          height={resolvedSize}
          left={15}
          opacity={glowOpacity}
          shadowColor={visual.accent}
          shadowOpacity={visual.quiet ? 0.32 : 0.62}
          shadowRadius={visual.quiet ? 20 : 30}
          top={15}
          width={resolvedSize}
        />
        <OrbLayer
          backgroundColor={visual.shell}
          borderColor={visual.ring}
          borderWidth={1.25}
          height={shellSize}
          opacity={visual.quiet ? 0.54 : 0.8}
          shadowColor={visual.accent}
          shadowOpacity={visual.quiet ? 0.22 : 0.44}
          shadowRadius={visual.quiet ? 14 : 22}
          top={(auraSize - shellSize) / 2}
          width={shellSize}
        />
        <OrbLayer
          backgroundColor={visual.core}
          borderColor={`${visual.accent}66`}
          borderWidth={1}
          height={ringSize}
          opacity={visual.quiet ? 0.72 : 0.92}
          shadowColor={visual.accent}
          shadowOpacity={0.24}
          shadowRadius={18}
          top={(auraSize - ringSize) / 2}
          width={ringSize}
        />
        <OrbLayer
          backgroundColor={`${visual.accent}1A`}
          height={innerSize}
          opacity={1}
          shadowColor={visual.accent}
          shadowOpacity={0.22}
          shadowRadius={12}
          top={(auraSize - innerSize) / 2}
          width={innerSize}
        />
        <OrbLayer
          backgroundColor={visual.accent}
          height={highlightHeight}
          opacity={shimmerOpacity}
          radius={999}
          top={resolvedSize * 0.23}
          width={highlightWidth}
        />
        <OrbLayer
          backgroundColor="#FFFFFF"
          height={Math.max(10, coreSize * 0.52)}
          opacity={visual.quiet ? 0.82 : 0.92}
          radius={999}
          top={resolvedSize * 0.43}
          width={Math.max(10, coreSize * 0.52)}
        />
        <OrbLayer
          backgroundColor={visual.accent}
          height={coreSize}
          opacity={visual.quiet ? 0.88 : 0.98}
          radius={999}
          shadowColor={visual.accent}
          shadowOpacity={0.76}
          shadowRadius={12}
          top={resolvedSize * 0.41}
          width={coreSize}
        />
        <OrbSpark accent={visual.accent} left={resolvedSize * 0.24} opacity={0.92} size={6} top={resolvedSize * 0.28} />
        <OrbSpark accent={visual.ring} left={resolvedSize * 0.7} opacity={0.72} size={5} top={resolvedSize * 0.18} />
        <OrbSpark accent={visual.core} left={resolvedSize * 0.66} opacity={0.65} size={4} top={resolvedSize * 0.72} />
        <OrbSpark accent={visual.glow} left={resolvedSize * 0.18} opacity={0.5} size={4} top={resolvedSize * 0.66} />
      </View>
    </Pressable>
  );
}

export const AnimatedOrb = memo(AnimatedOrbComponent);
