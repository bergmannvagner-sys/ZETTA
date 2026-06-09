import { useColorScheme, useWindowDimensions } from "react-native";

export const breakpoints = {
  mobile: 767,
  tablet: 1023
} as const;

export type AppBreakpoint = "mobile" | "tablet" | "desktop";
export type AppThemeName = "light" | "dark";
export type SurfaceRadii = {
  bottomLeft: number;
  bottomRight: number;
  topLeft: number;
  topRight: number;
};

export const appThemes = {
  light: {
    background: "#FAFAFC",
    surface: "#FFFFFF",
    surfaceSoft: "#F5F3FF",
    surfaceStrong: "#EDE9FE",
    glass: "rgba(255, 255, 255, 0.78)",
    primary: "#8B5CF6",
    primaryDark: "#7C3AED",
    primaryLight: "#C4B5FD",
    textPrimary: "#1F2937",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    border: "#DDD6FE",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
    shadow: "rgba(31, 41, 55, 0.10)",
    shadowStrong: "rgba(31, 41, 55, 0.16)",
    overlay: "rgba(31, 41, 55, 0.32)",
    gradientStart: "#F5F3FF",
    gradientMid: "#DDD6FE",
    gradientEnd: "#C4B5FD"
  },
  dark: {
    background: "#120F1F",
    surface: "#1C1630",
    surfaceSoft: "#261D42",
    surfaceStrong: "#352158",
    glass: "rgba(28, 22, 48, 0.78)",
    primary: "#A78BFA",
    primaryDark: "#8B5CF6",
    primaryLight: "#DDD6FE",
    textPrimary: "#F9FAFB",
    textSecondary: "#D1D5DB",
    textMuted: "#A78BFA",
    border: "#4C1D95",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#F87171",
    info: "#60A5FA",
    shadow: "rgba(0, 0, 0, 0.24)",
    shadowStrong: "rgba(0, 0, 0, 0.34)",
    overlay: "rgba(0, 0, 0, 0.56)",
    gradientStart: "#1C1630",
    gradientMid: "#2E2250",
    gradientEnd: "#4C1D95"
  }
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
      return { topLeft: 18, topRight: 28, bottomLeft: 22, bottomRight: 18 };
    }
    if (breakpoint === "tablet") {
      return { topLeft: 16, topRight: 24, bottomLeft: 20, bottomRight: 16 };
    }
    return { topLeft: 14, topRight: 22, bottomLeft: 18, bottomRight: 14 };
  }

  if (breakpoint === "desktop") {
    return { topLeft: 24, topRight: 36, bottomLeft: 28, bottomRight: 24 };
  }
  if (breakpoint === "tablet") {
    return { topLeft: 22, topRight: 32, bottomLeft: 26, bottomRight: 22 };
  }
  return { topLeft: 20, topRight: 28, bottomLeft: 24, bottomRight: 20 };
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
  const colorScheme = useColorScheme();
  const name: AppThemeName = colorScheme === "dark" ? "dark" : "light";
  return {
    name,
    colors: appThemes[name],
    isDark: name === "dark"
  };
}
