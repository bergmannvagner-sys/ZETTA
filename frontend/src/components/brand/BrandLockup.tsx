import { Text, View } from "react-native";

type BrandLockupProps = {
  align?: "left" | "center";
  compact?: boolean;
  showTagline?: boolean;
};

function MiniOrbMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 36 : 64;
  const particles = Array.from({ length: compact ? 18 : 34 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = size * (0.16 + Math.sqrt((index + 1) / (compact ? 18 : 34)) * 0.34);
    return {
      color: index % 7 === 0 ? "#FF4DFF" : index % 5 === 0 ? "#00E5FF" : "#FFFFFF",
      left: size * 0.5 + Math.cos(angle) * radius,
      opacity: 0.24 + (index % 4) * 0.12,
      size: 0.9 + (index % 3) * 0.42,
      top: size * 0.5 + Math.sin(angle) * radius * 0.82
    };
  });

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
      <View className="absolute rounded-full bg-azure/30" style={{ height: size * 0.9, width: size * 0.9 }} />
      <View className="absolute rounded-full border border-mint/20" style={{ height: size * 0.78, width: size * 0.78 }} />
      {particles.map((particle, index) => (
        <View
          key={index}
          className="absolute rounded-full"
          style={{
            backgroundColor: particle.color,
            height: particle.size,
            left: particle.left,
            opacity: particle.opacity,
            top: particle.top,
            width: particle.size
          }}
        />
      ))}
      <View
        className="absolute border-b-2 border-mint"
        style={{
          borderBottomLeftRadius: size * 0.32,
          borderBottomRightRadius: size * 0.32,
          bottom: size * 0.3,
          height: size * 0.18,
          width: size * 0.5
        }}
      />
      <View className="rounded-full bg-white" style={{ height: size * 0.12, width: size * 0.12 }} />
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
          <Text className={`${compact ? "text-xl" : "text-4xl"} font-light tracking-[10px] text-white`}>
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
