import { Platform, ViewStyle } from "react-native";

type ShadowOptions = {
  color: string;
  opacity?: number;
  radius?: number;
  offsetY?: number;
  elevation?: number;
};

export function shadowStyle({
  color,
  opacity = 0.24,
  radius = 12,
  offsetY = 6,
  elevation = 4
}: ShadowOptions): ViewStyle {
  if (Platform.OS === "android") {
    return {
      elevation,
      shadowColor: color
    };
  }

  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius
  };
}
