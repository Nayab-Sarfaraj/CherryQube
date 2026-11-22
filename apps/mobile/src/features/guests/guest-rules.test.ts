import { describe, expect, it } from "vitest";
import {
  canAddGuests,
  formatAllGuestsText,
  formatGuestShareText,
  getRemainingGuestCapacity,
  parsePastedGuestNames,
  sanitizeGuestName,
} from "./guest-rules";

describe("guest-rules", () => {
  describe("sanitizeGuestName", () => {
    it("strips formula injection prefixes and excessive whitespace", () => {
      expect(sanitizeGuestName("  =SUM(1,2) Alice  ")).toBe("SUM(1,2) Alice");
      expect(sanitizeGuestName("@Bob  Smith   ")).toBe("Bob Smith");
      expect(sanitizeGuestName("+Charlie")).toBe("Charlie");
      expect(sanitizeGuestName("-David")).toBe("David");
    });
  });

  describe("parsePastedGuestNames", () => {
    it("parses valid newline-separated names, ignores blank lines, and deduplicates case-insensitively", () => {
      const text = `
        Alice
        Bob Smith

        alice
        Charlie
      `;
      const result = parsePastedGuestNames(text);
      expect(result.validNames).toEqual(["Alice", "Bob Smith", "Charlie"]);
      expect(result.duplicateCount).toBe(1);
      expect(result.skippedEmptyCount).toBeGreaterThanOrEqual(2);
      expect(result.invalidLines).toHaveLength(0);
    });

    it("flags names that exceed 40 characters", () => {
      const longName = "A".repeat(45);
      const text = `Short Name\n${longName}\nAnother Name`;
      const result = parsePastedGuestNames(text);
      expect(result.validNames).toEqual(["Short Name", "Another Name"]);
      expect(result.invalidLines).toHaveLength(1);
      expect(result.invalidLines[0]?.reason).toContain("Exceeds 40 characters");
    });

    it("flags lines that are empty after stripping special characters", () => {
      const text = "====\nValid Person";
      const result = parsePastedGuestNames(text);
      expect(result.validNames).toEqual(["Valid Person"]);
      expect(result.invalidLines).toHaveLength(1);
      expect(result.invalidLines[0]?.reason).toContain(
        "empty after removing special prefix characters",
      );
    });
  });

  describe("capacity checks", () => {
    it("calculates remaining capacity and validates add counts against 200 limit", () => {
      expect(getRemainingGuestCapacity(0)).toBe(200);
      expect(getRemainingGuestCapacity(195)).toBe(5);
      expect(getRemainingGuestCapacity(200)).toBe(0);
      expect(getRemainingGuestCapacity(205)).toBe(0);

      expect(canAddGuests(195, 5)).toBe(true);
      expect(canAddGuests(195, 6)).toBe(false);
      expect(canAddGuests(200, 1)).toBe(false);
      expect(canAddGuests(0, 0)).toBe(false);
    });
  });

  describe("formatting payloads", () => {
    it("formats individual guest share text", () => {
      const text = formatGuestShareText(
        "Alice",
        "https://example.com/i/token-123",
      );
      expect(text).toBe(
        "Invitation for Alice: https://example.com/i/token-123",
      );
    });

    it("formats all guests as 'Name: link' lines", () => {
      const guests = [
        { name: "Alice", token: "tok-1", link: "https://example.com/i/tok-1" },
        { name: "Bob", token: "tok-2", link: "https://example.com/i/tok-2" },
      ];
      const payload = formatAllGuestsText(guests);
      expect(payload).toBe(
        "Alice: https://example.com/i/tok-1\nBob: https://example.com/i/tok-2",
      );
    });

    it("falls back to baseUrl when guest.link is missing", () => {
      const guests = [{ name: "Alice", token: "tok-1" }];
      const payload = formatAllGuestsText(guests, "https://example.com");
      expect(payload).toBe("Alice: https://example.com/i/tok-1");
    });
  });
});
