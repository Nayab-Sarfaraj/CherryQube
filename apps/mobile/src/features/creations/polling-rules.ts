export function shouldPollCreations(
  isFocused: boolean,
  isForeground: boolean,
  items?: { status: string }[],
): number | false {
  if (!isFocused || !isForeground || !items) return false;
  const hasRendering = items.some((item) =>
    ["queued", "rendering"].includes(item.status),
  );
  return hasRendering ? 3000 : false;
}

export function shouldPollRender(
  isFocused: boolean,
  isForeground: boolean,
  status?: string,
): number | false {
  if (!isFocused || !isForeground || !status) return false;
  if (
    status === "ready" ||
    status === "failed" ||
    status === "submission_uncertain"
  )
    return false;
  return 2000;
}

export function flattenCreationPages<T>(pages?: { items: T[] }[]): T[] {
  return pages?.flatMap((page) => page.items) ?? [];
}
