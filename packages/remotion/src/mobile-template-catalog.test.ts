import { describe, expect, it } from "vitest";
import { mobileTemplateCatalog } from "./mobile-template-catalog";
import { durationInFrames, templates } from "./templates";

describe("mobile template catalog", () => {
  it("derives every identifier, type, theme, and duration from the registry", () => {
    expect(mobileTemplateCatalog).toEqual(
      templates.map((template) => ({
        id: template.id,
        title: template.title,
        type: template.type,
        themeId: template.themeId,
        durationInFrames: durationInFrames(template),
        posterPath: `/posters/${template.id}.png`,
      })),
    );
  });
});
