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
  dashboardForRole,
  getOrganizerId,
  organizerRoles,
  requireOrganizer,
  roleLabels,
} = await import("@/lib/organizer");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dashboardForRole", () => {
  test("routes hackers to the hacker dashboard", () => {
    expect(dashboardForRole("HACKER")).toBe("/hacker");
  });

  test.each(["ORGANIZER", "DIRECTOR", "ADMIN"] as const)(
    "routes %s to the organizer dashboard",
    (role) => {
      expect(dashboardForRole(role)).toBe("/organizer");
    },
  );
});

describe("organizerRoles", () => {
  test("does not include HACKER", () => {
    expect(organizerRoles).not.toContain("HACKER");
  });
});

describe("roleLabels", () => {
  test("has a human-readable label for every role", () => {
    expect(roleLabels).toEqual({
      HACKER: "Participant",
      ORGANIZER: "Organizer",
      ORGANIZER_LEAD: "Organizer Lead",
      DIRECTOR: "Director",
      ADMIN: "Admin",
    });
  });
});

describe("requireOrganizer", () => {
  test("redirects to login without a membership", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(null);

    await expect(requireOrganizer()).rejects.toThrow("NEXT_REDIRECT:/login");

    getCurrentMembershipMock.mockResolvedValueOnce({
      userId: "u1",
      membership: null,
      memberships: [],
    });

    await expect(requireOrganizer()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  test("redirects a hacker to their own dashboard", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(currentMembership("HACKER"));

    await expect(requireOrganizer()).rejects.toThrow("NEXT_REDIRECT:/hacker");
  });

  test("redirects an organizer without one of the allowed roles", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(
      currentMembership("ORGANIZER"),
    );

    await expect(requireOrganizer(["ADMIN"])).rejects.toThrow(
      "NEXT_REDIRECT:/organizer",
    );
  });

  test("returns the organizer scoped to their active hackathon", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(
      currentMembership("ORGANIZER", "Logistics"),
    );

    expect(await requireOrganizer()).toEqual({
      id: "u1",
      name: "Jane Doe",
      role: "ORGANIZER",
      hackathonId: "h1",
      hackathonName: "BudgetHack",
      hackathonSettings: { roles: {} },
      hackathons: [
        { hackathonId: "h1", hackathonName: "BudgetHack", role: "ORGANIZER" },
      ],
      departmentId: "dep1",
      departmentName: "Logistics",
    });
  });
});

describe("getOrganizerId", () => {
  test("returns null without a membership", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(null);

    expect(await getOrganizerId(["ADMIN"])).toBeNull();
  });

  test("returns null when the role isn't allowed", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(
      currentMembership("ORGANIZER"),
    );

    expect(await getOrganizerId(["ADMIN"])).toBeNull();
  });

  test("returns the user and hackathon ids for an allowed role", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(currentMembership("ADMIN"));

    expect(await getOrganizerId(["ADMIN"])).toEqual({
      userId: "u1",
      hackathonId: "h1",
    });
  });
});
