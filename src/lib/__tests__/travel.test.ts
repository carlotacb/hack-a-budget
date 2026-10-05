import { describe, expect, test, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const getCurrentMembershipMock = vi.fn();
vi.mock("@/lib/current-hackathon", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/current-hackathon")>();
  return {
    ...actual,
    getCurrentMembership: (...args: unknown[]) =>
      getCurrentMembershipMock(...args),
  };
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

function currentMembership(role: string, departmentName?: string) {
  const membership = {
    hackathonId: "h1",
    role,
    departmentId: departmentName ? "dep1" : null,
    department: departmentName ? { name: departmentName } : null,
    user: { id: "u1", name: "Jane Doe", email: "jane@example.com" },
    hackathon: { name: "BudgetHack", settings: { roles: {} } },
  };
  return { userId: "u1", membership, memberships: [membership] };
}

const {
  formatEventDateTime,
  formatLocalDateTime,
  formatMoney,
  getCurrentUser,
  getHackerId,
  parseLocalDateTime,
  requireHacker,
} = await import("@/lib/travel");

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("formatEventDateTime", () => {
  test("formats a configured date", () => {
    expect(formatEventDateTime(new Date(2026, 2, 5, 9, 5))).toContain("2026");
  });

  test("reports a missing date as not configured", () => {
    expect(formatEventDateTime(null)).toBe("Not configured");
  });
});

describe("getCurrentUser", () => {
  test("returns null without a membership", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(null);

    expect(await getCurrentUser()).toBeNull();
  });

  test("returns the user's identity within the active hackathon", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(currentMembership("HACKER"));

    expect(await getCurrentUser()).toEqual({
      id: "u1",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "HACKER",
      hackathonId: "h1",
      hackathons: [
        { hackathonId: "h1", hackathonName: "BudgetHack", role: "HACKER" },
      ],
    });
  });
});

describe("requireHacker", () => {
  test("redirects to login when signed out", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(null);

    await expect(requireHacker()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  test("redirects organizers to their dashboard", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(currentMembership("ADMIN"));

    await expect(requireHacker()).rejects.toThrow("NEXT_REDIRECT:/organizer");
  });

  test("returns the hacker", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(currentMembership("HACKER"));

    expect(await requireHacker()).toMatchObject({ id: "u1", role: "HACKER" });
  });
});

describe("getHackerId", () => {
  test("returns the id only for hackers", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(currentMembership("HACKER"));
    expect(await getHackerId()).toBe("u1");

    getCurrentMembershipMock.mockResolvedValueOnce(currentMembership("ADMIN"));
    expect(await getHackerId()).toBeNull();

    getCurrentMembershipMock.mockResolvedValueOnce(null);
    expect(await getHackerId()).toBeNull();
  });
});
