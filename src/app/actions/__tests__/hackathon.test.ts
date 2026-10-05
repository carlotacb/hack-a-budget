import { describe, expect, test, vi, beforeEach } from "vitest";

const getCurrentMembershipMock = vi.fn();
const setActiveHackathonMock = vi.fn();
vi.mock("@/lib/current-hackathon", () => ({
  getCurrentMembership: (...args: unknown[]) =>
    getCurrentMembershipMock(...args),
  setActiveHackathon: (...args: unknown[]) => setActiveHackathonMock(...args),
}));

vi.mock("@/lib/organizer", () => ({
  dashboardForRole: (role: string) =>
    role === "HACKER" ? "/hacker" : "/organizer",
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

const { switchActiveHackathon } = await import("@/app/actions/hackathon");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("switchActiveHackathon", () => {
  test("redirects to login when signed out", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce(null);

    await expect(switchActiveHackathon("h1")).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(setActiveHackathonMock).not.toHaveBeenCalled();
  });

  test("ignores a hackathon the user doesn't belong to", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce({
      memberships: [{ hackathonId: "h1", role: "ADMIN" }],
    });

    await expect(switchActiveHackathon("other")).resolves.toBeUndefined();
    expect(setActiveHackathonMock).not.toHaveBeenCalled();
  });

  test("activates the hackathon and redirects to the matching dashboard", async () => {
    getCurrentMembershipMock.mockResolvedValueOnce({
      memberships: [
        { hackathonId: "h1", role: "ADMIN" },
        { hackathonId: "h2", role: "HACKER" },
      ],
    });

    await expect(switchActiveHackathon("h2")).rejects.toThrow(
      "NEXT_REDIRECT:/hacker",
    );
    expect(setActiveHackathonMock).toHaveBeenCalledWith("h2");
  });
});
