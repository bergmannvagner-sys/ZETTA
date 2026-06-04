import { Text, View } from "react-native";

type BrandLockupProps = {
  align?: "left" | "center";
  compact?: boolean;
  showTagline?: boolean;
};

function MiniOrbMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 42 : 64;
  return (
    <View
      className="items-center justify-center rounded-full border border-azure/35 bg-ink"
      style={{
        height: size,
        width: size,
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.28,
        shadowRadius: compact ? 12 : 18
      }}
    >
      <View className="absolute rounded-full bg-azure/45" style={{ height: size * 0.84, width: size * 0.84 }} />
      <View className="absolute rounded-full bg-violet/45" style={{ height: size * 0.62, width: size * 0.62 }} />
      <View
        className="absolute border-b-2 border-mint"
        style={{
          borderBottomLeftRadius: size * 0.32,
          borderBottomRightRadius: size * 0.32,
          bottom: size * 0.24,
          height: size * 0.24,
          width: size * 0.58
        }}
      />
      <Text
        className="absolute font-light"
        style={{
          color: "rgba(184, 155, 255, 0.46)",
          fontSize: size * 0.34,
          letterSpacing: size * 0.02,
          lineHeight: size * 0.36,
          transform: [{ translateY: size * 0.04 }]
        }}
      >
        B
      </Text>
      <View className="rounded-full bg-white" style={{ height: size * 0.13, width: size * 0.13 }} />
    </View>
  );
}

export function BrandLockup({ align = "center", compact = false, showTagline = true }: BrandLockupProps) {
  const center = align === "center";
  return (
    <View className={`${center ? "items-center" : "items-start"} gap-3`}>
      <View className={`${center ? "items-center" : "items-start"} gap-2`}>
        <MiniOrbMark compact={compact} />
        <View className={`${center ? "items-center" : "items-start"} gap-1`}>
          <Text className={`${compact ? "text-2xl" : "text-4xl"} font-light tracking-[10px] text-white`}>
            ZETTA
          </Text>
          <Text className={`${compact ? "text-xs" : "text-sm"} font-semibold tracking-[8px] text-mint`}>
            BERGMANN
          </Text>
        </View>
      </View>
      {showTagline ? (
        <Text className={`${center ? "text-center" : "text-left"} text-xs tracking-[3px] text-muted`}>
          AQUI NINGUEM FICA SOZINHO.
        </Text>
      ) : null}
    </View>
  );
}
