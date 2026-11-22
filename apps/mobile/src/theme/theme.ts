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
  },
  font: typography,
} as const;
