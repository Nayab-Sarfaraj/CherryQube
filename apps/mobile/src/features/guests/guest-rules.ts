export const MAX_GUESTS_PER_INVITATION = 200;
export const MAX_GUEST_NAME_LENGTH = 40;

export type ParsedPastedNames = {
  validNames: string[];
  skippedEmptyCount: number;
  duplicateCount: number;
  invalidLines: { line: number; text: string; reason: string }[];
};

/**
 * Sanitize client-side input for immediate user feedback.
 * Server remains authoritative for full normalization and cap checks.
 */
export function sanitizeGuestName(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/^[=+\-@]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse newline-separated text pasted by user.
 */
export function parsePastedGuestNames(text: string): ParsedPastedNames {
  const rawLines = text.split(/\r?\n/);
  const seenKeys = new Set<string>();
  const validNames: string[] = [];
  const invalidLines: { line: number; text: string; reason: string }[] = [];
  let skippedEmptyCount = 0;
  let duplicateCount = 0;

  rawLines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      skippedEmptyCount += 1;
      return;
    }

    const sanitized = sanitizeGuestName(trimmed);
    if (!sanitized) {
      invalidLines.push({
        line: index + 1,
        text: rawLine,
        reason: "Name is empty after removing special prefix characters",
      });
      return;
    }

    if (sanitized.length > MAX_GUEST_NAME_LENGTH) {
      invalidLines.push({
        line: index + 1,
        text: rawLine,
        reason: `Exceeds ${MAX_GUEST_NAME_LENGTH} characters (${sanitized.length})`,
      });
      return;
    }

    const key = sanitized.toLocaleLowerCase("en-US");
    if (seenKeys.has(key)) {
      duplicateCount += 1;
      return;
    }

    seenKeys.add(key);
    validNames.push(sanitized);
  });

  return {
    validNames,
    skippedEmptyCount,
    duplicateCount,
    invalidLines,
  };
}

/**
 * Calculate remaining guest slots out of 200.
 */
export function getRemainingGuestCapacity(currentCount: number): number {
  return Math.max(0, MAX_GUESTS_PER_INVITATION - currentCount);
}

/**
 * Check if the addition would exceed 200 guests.
 */
export function canAddGuests(
  currentCount: number,
  additionalCount: number,
): boolean {
  return (
    currentCount >= 0 &&
    additionalCount > 0 &&
    currentCount + additionalCount <= MAX_GUESTS_PER_INVITATION
  );
}

/**
 * Format single guest share text.
 */
export function formatGuestShareText(name: string, link: string): string {
  return `Invitation for ${name}: ${link}`;
}

/**
 * Format all guests as "Name: link" lines.
 */
export function formatAllGuestsText(
  guests: { name: string; link?: string; token: string }[],
  baseUrl?: string,
): string {
  return guests
    .map((g) => {
      const url =
        g.link ||
        (baseUrl ? `${baseUrl.replace(/\/$/, "")}/i/${g.token}` : g.token);
      return `${g.name}: ${url}`;
    })
    .join("\n");
}
