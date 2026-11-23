import { palettes, typography } from "@greetings/shared";

const harvest = palettes.thanksgiving;

export const mobileTheme = {
  colors: {
    canvas: harvest.paper,
    background: harvest.paper,
    surface: "#FFFFFF",
    card: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#F7F2EA",
    paper: harvest.paper + "E6",
    ink: harvest.ink,
    quietInk: harvest.olive,
    muted: harvest.oxblood,
    accent: harvest.oxblood,
    accentGold: harvest.marigold,
    accentSage: harvest.olive,
    border: harvest.olive + "33",
    hairline: harvest.olive + "22",
    videoBackdrop: harvest.ink,
    palette: harvest,
    status: {
      draftBg: "#F4EEE3",
      draftText: harvest.ink,
      renderingBg: harvest.marigold + "22",
      renderingText: harvest.pumpkin,
      readyBg: harvest.olive + "22",
      readyText: harvest.olive,
      failedBg: harvest.oxblood + "18",
      failedText: harvest.oxblood,
    },
  },
  radius: {
    card: 20,
    cardSmall: 16,
    pill: 9999,
    sheet: 24,
    badge: 9999,
  },
  shadows: {
    card: {
      shadowColor: harvest.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    cardElevated: {
      shadowColor: harvest.ink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
    pill: {
      shadowColor: harvest.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    floating: {
      shadowColor: harvest.ink,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 5,
    },
  },
  font: typography,
} as const;
