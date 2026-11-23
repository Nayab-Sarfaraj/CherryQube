import { palettes, typography } from "@greetings/shared";

const harvest = palettes.thanksgiving;

export const mobileTheme = {
  colors: {
    canvas: harvest.paper,
    background: harvest.paper,
    surface: harvest.paper,
    paper: harvest.paper + "E6",
    ink: harvest.ink,
    quietInk: harvest.olive,
    muted: harvest.oxblood,
    accent: harvest.oxblood,
    border: harvest.olive,
    hairline: harvest.olive + "55",
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
