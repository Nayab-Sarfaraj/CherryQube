import { palettes, typography } from "@greetings/shared";

const harvest = palettes.thanksgiving;

export const mobileTheme = {
  colors: {
    background: harvest.paper,
    surface: harvest.paper,
    ink: harvest.ink,
    muted: harvest.oxblood,
    accent: harvest.oxblood,
    border: harvest.olive,
    videoBackdrop: harvest.ink,
    palette: harvest,
    status: {
      draftBg: harvest.paper,
      draftText: harvest.ink,
      renderingBg: harvest.marigold + "26",
      renderingText: harvest.pumpkin,
      readyBg: harvest.olive + "26",
      readyText: harvest.olive,
      failedBg: harvest.oxblood + "1A",
      failedText: harvest.oxblood,
    },
  },
  font: typography,
} as const;
