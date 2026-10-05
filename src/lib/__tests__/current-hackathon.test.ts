import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const membershipFindManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    hackathonMembership: {
      findMany: (...args: unknown[]) => membershipFindManyMock(...args),
    },
  },
}));

const cookieGetMock = vi.fn();
const cookieSetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (...args: unknown[]) => cookieGetMock(...args),
    set: (...args: unknown[]) => cookieSetMock(...args),
  }),
}));

const {
  ACTIVE_HACKATHON_COOKIE,
  getCurrentMembership,
  getMemberships,
  setActiveHackathon,
  toHackathonOptions,
} = await import("@/lib/current-hackathon");

function membership(hackathonId: string, role = "ADMIN") {
  return {
    hackathonId,
    role,
    hackathon: { name: `Hack ${hackathonId}` },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMemberships", () => {
  test("loads every membership for the user, oldest first", async () => {
    membershipFindManyMock.mockResolvedValueOnce([]);

    await getMemberships("u1");

    expect(membershipFindManyMock).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { hackathon: true, user: true, department: true },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("getCurrentMembership", () => {
  test("returns null without a session", async () => {
    authMock.mockResolvedValueOnce(null);

    expect(await getCurrentMembership()).toBeNull();
    expect(membershipFindManyMock).not.toHaveBeenCalled();
  });

  test("returns a null membership when the user belongs to no hackathon", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    membershipFindManyMock.mockResolvedValueOnce([]);

    expect(await getCurrentMembership()).toEqual({
      userId: "u1",
      membership: null,
      memberships: [],
    });
  });

  test("picks the hackathon remembered in the cookie", async () => {
    const memberships = [membership("h1"), membership("h2")];
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    membershipFindManyMock.mockResolvedValueOnce(memberships);
    cookieGetMock.mockReturnValueOnce({ value: "h2" });

    const current = await getCurrentMembership();

    expect(cookieGetMock).toHaveBeenCalledWith(ACTIVE_HACKATHON_COOKIE);
    expect(current?.membership).toBe(memberships[1]);
    expect(current?.memberships).toBe(memberships);
  });

  test("falls back to the first membership for an unknown or missing cookie", async () => {
    const memberships = [membership("h1"), membership("h2")];
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    membershipFindManyMock.mockResolvedValueOnce(memberships);
    cookieGetMock.mockReturnValueOnce({ value: "someone-elses-hackathon" });

    expect((await getCurrentMembership())?.membership).toBe(memberships[0]);

    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    membershipFindManyMock.mockResolvedValueOnce(memberships);
    cookieGetMock.mockReturnValueOnce(undefined);

    expect((await getCurrentMembership())?.membership).toBe(memberships[0]);
  });
});

describe("setActiveHackathon", () => {
  test("stores the hackathon id in a long-lived http-only cookie", async () => {
    await setActiveHackathon("h2");

    expect(cookieSetMock).toHaveBeenCalledWith(ACTIVE_HACKATHON_COOKIE, "h2", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  });
});

describe("toHackathonOptions", () => {
  test("maps memberships to client-safe switcher options", () => {
    const options = toHackathonOptions([
      membership("h1", "ADMIN"),
      membership("h2", "HACKER"),
    ] as unknown as Parameters<typeof toHackathonOptions>[0]);

    expect(options).toEqual([
      { hackathonId: "h1", hackathonName: "Hack h1", role: "ADMIN" },
      { hackathonId: "h2", hackathonName: "Hack h2", role: "HACKER" },
    ]);
  });
});
