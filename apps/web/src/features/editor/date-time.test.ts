import { describe, expect, it } from "vitest";
import { invitationSchema } from "@greetings/remotion";
import { dateTimeParts, localDateTimeWithOffset } from "./date-time";

describe("invitation date and time", () => {
  it("loads the calendar date and wall-clock time without shifting time zones", () => {
    expect(dateTimeParts("2026-11-26T18:00:00-05:00")).toEqual({
      date: "2026-11-26",
      time: "18:00",
    });
  });

  it("saves a picked time with the device offset in the existing schema", () => {
    const result = localDateTimeWithOffset("2026-11-26", "18:30");
    expect(result).toMatch(/^2026-11-26T18:30:00[+-]\d{2}:\d{2}$/);
    expect(
      invitationSchema.safeParse({
        type: "invitation",
        themeId: "thanksgiving",
        eventTitle: "Dinner",
        hostName: "Alex",
        dateTime: result,
        locationText: "At our home",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid calendar dates and times", () => {
    expect(localDateTimeWithOffset("2026-02-30", "18:00")).toBeUndefined();
    expect(localDateTimeWithOffset("2026-11-26", "25:00")).toBeUndefined();
  });
});
