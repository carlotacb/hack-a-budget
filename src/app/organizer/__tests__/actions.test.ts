import { describe, expect, test, vi, beforeEach } from "vitest";

const requireOrganizerMock = vi.fn();
vi.mock("@/lib/organizer", () => ({
  requireOrganizer: (...args: unknown[]) => requireOrganizerMock(...args),
}));

const membershipUpdateManyMock = vi.fn();
const departmentFindFirstMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    hackathonMembership: {
      updateMany: (...args: unknown[]) => membershipUpdateManyMock(...args),
    },
    department: {
      findFirst: (...args: unknown[]) => departmentFindFirstMock(...args),
    },
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const { updateUserRole } = await import("@/app/organizer/actions");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const otherUserId = "clabcdefghijklmnopqrstu1";
const adminId = "clabcdefghijklmnopqrstu2";
const departmentId = "clabcdefghijklmnopqrstu3";

function asAdmin(hackathonSettings: unknown = null) {
  requireOrganizerMock.mockResolvedValueOnce({
    id: adminId,
    role: "ADMIN",
    hackathonId: "h1",
    hackathonSettings,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateUserRole", () => {
  test("requires an admin", async () => {
    requireOrganizerMock.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));

    await expect(
      updateUserRole({}, formData({ userId: otherUserId, role: "ORGANIZER" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(requireOrganizerMock).toHaveBeenCalledWith(["ADMIN"]);
    expect(membershipUpdateManyMock).not.toHaveBeenCalled();
  });

  test("errors on invalid form data", async () => {
    asAdmin();

    const result = await updateUserRole(
      {},
      formData({ userId: "not-a-cuid", role: "ORGANIZER" }),
    );

    expect(result.error).toBe("The selected user is invalid.");
  });

  test("errors when trying to change your own role", async () => {
    asAdmin();

    const result = await updateUserRole(
      {},
      formData({ userId: adminId, role: "ORGANIZER" }),
    );

    expect(result.error).toBe("You cannot change your own role.");
  });

  test("errors when the target role is disabled for the hackathon", async () => {
    asAdmin({ roles: { DIRECTOR: { enabled: false } } });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "DIRECTOR" }),
    );

    expect(result.error).toBe("This role is disabled for this hackathon.");
    expect(membershipUpdateManyMock).not.toHaveBeenCalled();
  });

  test("errors when the user is no longer a member", async () => {
    asAdmin();
    membershipUpdateManyMock.mockResolvedValueOnce({ count: 0 });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER" }),
    );

    expect(result.error).toBe("This user no longer exists.");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("updates the membership role and revalidates on success", async () => {
    asAdmin();
    membershipUpdateManyMock.mockResolvedValueOnce({ count: 1 });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER", departmentId }),
    );

    expect(membershipUpdateManyMock).toHaveBeenCalledWith({
      where: { userId: otherUserId, hackathonId: "h1" },
      data: { role: "ORGANIZER", departmentId: null },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/users");
    expect(result).toEqual({ success: true });
  });
});
