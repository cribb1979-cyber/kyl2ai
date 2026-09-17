export const colors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF1F4",
  graphite: "#1C2430",
  graphiteMuted: "#5A6472",
  hairline: "#D7DCE2",
  teal: "#00C2B8",
  tealMuted: "#DFF7F5",
  coral: "#FF6B4A",
  coralMuted: "#FFE6E0",
  amber: "#F5A623",
  amberMuted: "#FDF0DA",
  white: "#FFFFFF",
} as const;

export const fonts = {
  display: "SpaceGrotesk-Bold",
  displayMedium: "SpaceGrotesk-Medium",
  body: "SpaceGrotesk-Regular",
  mono: "JetBrainsMono-Regular",
  monoMedium: "JetBrainsMono-Medium",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** Expiry status thresholds, in days remaining. */
export function expiryStatus(daysLeft: number): "fresh" | "soon" | "expired" {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "soon";
  return "fresh";
}

export function expiryColor(status: ReturnType<typeof expiryStatus>): string {
  switch (status) {
    case "expired":
      return colors.coral;
    case "soon":
      return colors.amber;
    default:
      return colors.teal;
  }
}
