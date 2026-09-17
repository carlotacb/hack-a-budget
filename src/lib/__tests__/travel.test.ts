import { describe, expect, test, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { formatLocalDateTime, formatMoney, parseLocalDateTime } = await import(
  "@/lib/travel"
);

describe("parseLocalDateTime", () => {
  test("parses a well-formed local datetime string", () => {
    const date = parseLocalDateTime("2026-03-05T14:30");

    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(2);
    expect(date?.getDate()).toBe(5);
    expect(date?.getHours()).toBe(14);
    expect(date?.getMinutes()).toBe(30);
  });

  test("rejects a malformed string", () => {
    expect(parseLocalDateTime("not-a-date")).toBeNull();
    expect(parseLocalDateTime("2026-03-05")).toBeNull();
    expect(parseLocalDateTime("2026-03-05 14:30")).toBeNull();
  });

  test("rejects an impossible calendar date", () => {
    expect(parseLocalDateTime("2026-02-30T10:00")).toBeNull();
  });
});

describe("formatLocalDateTime", () => {
  test("formats a date back into the local datetime input format", () => {
    const date = new Date(2026, 2, 5, 9, 5, 0, 0);

    expect(formatLocalDateTime(date)).toBe("2026-03-05T09:05");
  });

  test("returns an empty string for null or undefined", () => {
    expect(formatLocalDateTime(null)).toBe("");
    expect(formatLocalDateTime(undefined)).toBe("");
  });

  test("round-trips through parseLocalDateTime", () => {
    const value = "2026-11-23T18:45";
    expect(formatLocalDateTime(parseLocalDateTime(value))).toBe(value);
  });
});

describe("formatMoney", () => {
  test("formats cents as currency", () => {
    expect(formatMoney(12345)).toBe("€123.45");
  });

  test("supports other currency codes", () => {
    expect(formatMoney(500, "USD")).toBe("$5.00");
  });

  test("returns a placeholder for null or undefined", () => {
    expect(formatMoney(null)).toBe("Not set");
    expect(formatMoney(undefined)).toBe("Not set");
  });
});
