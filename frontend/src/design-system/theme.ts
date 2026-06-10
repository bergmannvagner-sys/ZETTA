import { useWindowDimensions } from "react-native";

export const breakpoints = {
  mobile: 767,
  tablet: 1023
} as const;

export type AppBreakpoint = "mobile" | "tablet" | "desktop";
export type SurfaceRadii = {
  bottomLeft: number;
  bottomRight: number;
  topLeft: number;
  topRight: number;
};

export const appTheme = {
  background: "#1A1030",
  surface: "#24153E",
  surfaceSoft: "#2B1849",
  surfaceStrong: "#37215D",
  glass: "rgba(28, 17, 49, 0.88)",
  primary: "#A855F7",
  primaryDark: "#DDD6FE",
  primaryLight: "#D8B4FE",
  textPrimary: "#F5EEFF",
  textSecondary: "#D9C8F0",
  textMuted: "#B7A3D8",
  border: "#4B2D78",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  shadow: "rgba(7, 4, 20, 0.32)",
  shadowStrong: "rgba(7, 4, 20, 0.44)",
  overlay: "rgba(6, 5, 18, 0.58)",
  gradientStart: "#1A1030",
  gradientMid: "#2B1849",
  gradientEnd: "#4C1D95"
} as const;

export const radii = {
  sm: 14,
  md: 20,
  lg: 24,
  xl: 32,
  pill: 999
} as const;

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48
} as const;

export const typography = {
  min: 14,
  body: 16,
  lead: 18,
  title: 32,
  hero: 40
} as const;

export const touchTarget = {
  ios: 44,
  android: 48,
  comfortable: 56
} as const;

export function getBreakpoint(width: number): AppBreakpoint {
  if (width <= breakpoints.mobile) return "mobile";
  if (width <= breakpoints.tablet) return "tablet";
  return "desktop";
}

export function getContentMaxWidth(width: number): number | undefined {
  const breakpoint = getBreakpoint(width);
  if (breakpoint === "desktop") return 1120;
  if (breakpoint === "tablet") return 960;
  return undefined;
}

export function getResponsiveColumns(width: number, desiredMinWidth = 216): number {
  const breakpoint = getBreakpoint(width);
  if (breakpoint === "mobile") return width <= 360 ? 1 : 2;
  const contentWidth = Math.min(width, getContentMaxWidth(width) ?? width);
  return Math.max(2, Math.min(4, Math.floor(contentWidth / desiredMinWidth)));
}

export function getSurfaceRadii(width: number, kind: "card" | "control" = "card"): SurfaceRadii {
  const breakpoint = getBreakpoint(width);
  if (kind === "control") {
    if (breakpoint === "desktop") {
      return { topLeft: 20, topRight: 20, bottomLeft: 20, bottomRight: 20 };
    }
    if (breakpoint === "tablet") {
      return { topLeft: 18, topRight: 18, bottomLeft: 18, bottomRight: 18 };
    }
    return { topLeft: 16, topRight: 16, bottomLeft: 16, bottomRight: 16 };
  }

  if (breakpoint === "desktop") {
    return { topLeft: 30, topRight: 30, bottomLeft: 30, bottomRight: 30 };
  }
  if (breakpoint === "tablet") {
    return { topLeft: 26, topRight: 26, bottomLeft: 26, bottomRight: 26 };
  }
  return { topLeft: 22, topRight: 22, bottomLeft: 22, bottomRight: 22 };
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);
  const horizontalPadding = width <= 360 ? 16 : breakpoint === "mobile" ? 24 : 32;
  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
    contentMaxWidth: getContentMaxWidth(width),
    horizontalPadding,
    columns: getResponsiveColumns(width)
  };
}

export function useAppTheme() {
  return {
    name: "light" as const,
    colors: appTheme
  };
}
