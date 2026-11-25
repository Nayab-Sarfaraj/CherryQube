export function dateTimeParts(value: string) {
  return {
    date: value.slice(0, 10),
    time: value.slice(11, 16),
  };
}

export function localDateTimeWithOffset(date: string, time: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !timeMatch) return undefined;

  const [, year, month, day] = match;
  const [, hour, minute] = timeMatch;
  const local = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  if (
    local.getFullYear() !== Number(year) ||
    local.getMonth() + 1 !== Number(month) ||
    local.getDate() !== Number(day) ||
    local.getHours() !== Number(hour) ||
    local.getMinutes() !== Number(minute)
  )
    return undefined;

  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, "0")}:${String(absoluteOffset % 60).padStart(2, "0")}`;
  return `${date}T${time}:00${offset}`;
}
