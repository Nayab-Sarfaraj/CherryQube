import type { ThemeId } from "./design-tokens";

export type TemplateOrderingItem = {
  themeId: ThemeId;
  title: string;
};

const holidayDates: Record<ThemeId, readonly [number, number]> = {
  thanksgiving: [10, 26],
  christmas: [11, 25],
  "new-year": [11, 31],
};

function nextHoliday(themeId: ThemeId, now: Date) {
  const [month, day] = holidayDates[themeId];
  const candidate = new Date(now.getFullYear(), month, day);
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate.getTime();
}

export function orderTemplates<T extends TemplateOrderingItem>(
  templates: readonly T[],
  now = new Date(),
) {
  return [...templates].sort((left, right) => {
    const distance =
      nextHoliday(left.themeId, now) - nextHoliday(right.themeId, now);
    return distance || left.title.localeCompare(right.title);
  });
}
