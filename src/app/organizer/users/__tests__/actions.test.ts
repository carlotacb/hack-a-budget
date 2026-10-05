import { describe, expect, test, vi, beforeEach } from "vitest";

const requireOrganizerMock = vi.fn();
vi.mock("@/lib/organizer", () => ({
  requireOrganizer: (...args: unknown[]) => requireOrganizerMock(...args),
}));

vi.mock("@/lib/hackathon", () => ({
  generateInviteToken: () => "generated-token",
}));

const inviteCreateMock = vi.fn();
const inviteDeleteManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    hackerInvite: {
      create: (...args: unknown[]) => inviteCreateMock(...args),
      deleteMany: (...args: unknown[]) => inviteDeleteManyMock(...args),
    },
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const { createHackerInvite, revokeHackerInvite } = await import(
  "@/app/organizer/users/actions"
);

beforeEach(() => {
  vi.clearAllMocks();
  requireOrganizerMock.mockResolvedValue({ id: "admin1", hackathonId: "h1" });
});

describe("createHackerInvite", () => {
  test("creates an invite for the admin's hackathon", async () => {
    const result = await createHackerInvite();

    expect(requireOrganizerMock).toHaveBeenCalledWith(["ADMIN"]);
    expect(inviteCreateMock).toHaveBeenCalledWith({
      data: {
        token: "generated-token",
        createdById: "admin1",
        hackathonId: "h1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/users");
    expect(result).toEqual({});
  });
});

describe("revokeHackerInvite", () => {
  test("deletes only an unused invite in the admin's hackathon", async () => {
    const result = await revokeHackerInvite("invite1");

    expect(requireOrganizerMock).toHaveBeenCalledWith(["ADMIN"]);
    expect(inviteDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "invite1", usedAt: null, hackathonId: "h1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/users");
    expect(result).toEqual({});
  });
});
