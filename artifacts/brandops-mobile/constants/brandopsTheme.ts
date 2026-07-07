export const BrandOpsTheme = {
  colors: {
    bg: "#0A0A0A",
    bgElevated: "#0E0E0E",
    card: "rgba(255,255,255,0.04)",
    card2: "rgba(255,255,255,0.06)",
    surface: "rgba(255,255,255,0.05)",
    surfaceHover: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.10)",
    text: "#FAFAFA",
    muted: "rgba(255,255,255,0.70)",
    subtle: "rgba(255,255,255,0.45)",
    lime: "#C6FF00",
    limeSoft: "rgba(198,255,0,0.14)",
    limeGlow: "rgba(198,255,0,0.22)",
    danger: "#FF4D4D",
    warning: "#FFC94D",
    success: "#37D67A",
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  },
  shadow: {
    glow: {
      shadowColor: "#C6FF00",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
    soft: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 6,
    },
  },
} as const;

export type BrandOpsThemeType = typeof BrandOpsTheme;
