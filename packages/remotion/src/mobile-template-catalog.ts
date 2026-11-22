import { durationInFrames, templates } from "./templates";

export const mobileTemplateCatalog = templates.map((template) => ({
  id: template.id,
  title: template.title,
  type: template.type,
  themeId: template.themeId,
  durationInFrames: durationInFrames(template),
  posterPath: `/posters/${template.id}.png`,
}));
