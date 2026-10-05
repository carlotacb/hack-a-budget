import { describe, expect, test, vi, beforeEach } from "vitest";

const getCurrentMembershipMock = vi.fn();
vi.mock("@/lib/current-hackathon", () => ({
  getCurrentMembership: (...args: unknown[]) =>
    getCurrentMembershipMock(...args),
}));

const { getPermittedOrganizer } = await import("@/lib/permissions");

function current({
  role = "ORGANIZER",
  departmentId = null as string | null,
  settings = null as unknown,
} = {}) {
  return {
    userId: "u1",
    membership: {
      hackathonId: "h1",
      role,
      departmentId,
      hackathon: { settings },
    },
    memberships: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPermittedOrganizer", () => {
  test("returns null without a session", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(null);

    expect(await getPermittedOrganizer("seeBudget")).toBeNull();
  });

  test("returns null without a membership", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce({
      userId: "u1",
      membership: null,
      memberships: [],
    });

    expect(await getPermittedOrganizer("seeBudget")).toBeNull();
  });

  test("returns null when the role lacks the permission", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(current({ role: "HACKER" }));

    expect(await getPermittedOrganizer("addExpenses")).toBeNull();
  });

  test("returns null when the role is disabled for the hackathon", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(
      current({
        role: "DIRECTOR",
        settings: { roles: { DIRECTOR: { enabled: false } } },
      }),
    );

    expect(await getPermittedOrganizer("seeBudget")).toBeNull();
  });

  test("grants event-wide access to an admin", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(current({ role: "ADMIN" }));

    expect(await getPermittedOrganizer("seeBudget")).toEqual({
      userId: "u1",
      hackathonId: "h1",
      role: "ADMIN",
      departmentId: null,
    });
  });

  test("scopes department permissions to the organizer's department", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(
      current({
        role: "ORGANIZER",
        departmentId: "dep1",
        settings: {
          roles: {
            ORGANIZER: {
              requiresDepartment: true,
              permissions: { addExpenses: true, checkRefunds: true },
            },
          },
        },
      }),
    );

    expect(await getPermittedOrganizer("addExpenses")).toMatchObject({
      departmentId: "dep1",
    });
  });

  test("does not scope permissions that aren't department-scoped", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(
      current({
        role: "ORGANIZER",
        departmentId: "dep1",
        settings: { roles: { ORGANIZER: { permissions: { checkRefunds: true } } } },
      }),
    );

    expect(await getPermittedOrganizer("checkRefunds")).toMatchObject({
      departmentId: null,
    });
  });
});
