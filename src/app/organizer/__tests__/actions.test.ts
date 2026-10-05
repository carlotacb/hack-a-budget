import { describe, expect, test, vi, beforeEach } from "vitest";

const requireOrganizerMock = vi.fn();
vi.mock("@/lib/organizer", () => ({
  requireOrganizer: (...args: unknown[]) => requireOrganizerMock(...args),
}));

const membershipUpdateManyMock = vi.fn();
const departmentFindFirstMock = vi.fn();
const membershipFindUniqueMock = vi.fn();
const membershipDeleteMock = vi.fn();
const membershipCountMock = vi.fn();
const userDeleteMock = vi.fn();
const tx = {
  hackathonMembership: {
    findUnique: (...args: unknown[]) => membershipFindUniqueMock(...args),
    delete: (...args: unknown[]) => membershipDeleteMock(...args),
    count: (...args: unknown[]) => membershipCountMock(...args),
  },
  user: { delete: (...args: unknown[]) => userDeleteMock(...args) },
};
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
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

const { updateUserRole, deleteOrganizerUser } = await import(
  "@/app/organizer/actions"
);

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

  test("errors when the role requires a department and none is given", async () => {
    asAdmin({ roles: { ORGANIZER: { requiresDepartment: true } } });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER" }),
    );

    expect(result.error).toBe("Select a department for this role.");
  });

  test("errors when the department is outside the hackathon", async () => {
    asAdmin({ roles: { ORGANIZER: { requiresDepartment: true } } });
    departmentFindFirstMock.mockResolvedValueOnce(null);

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER", departmentId }),
    );

    expect(departmentFindFirstMock).toHaveBeenCalledWith({
      where: { id: departmentId, hackathonId: "h1" },
      select: { id: true },
    });
    expect(result.error).toBe("The selected department is invalid.");
    expect(membershipUpdateManyMock).not.toHaveBeenCalled();
  });

  test("saves the department for a department-linked role", async () => {
    asAdmin({ roles: { ORGANIZER: { requiresDepartment: true } } });
    departmentFindFirstMock.mockResolvedValueOnce({ id: departmentId });
    membershipUpdateManyMock.mockResolvedValueOnce({ count: 1 });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER", departmentId }),
    );

    expect(membershipUpdateManyMock).toHaveBeenCalledWith({
      where: { userId: otherUserId, hackathonId: "h1" },
      data: { role: "ORGANIZER", departmentId },
    });
    expect(result).toEqual({ success: true });
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

describe("deleteOrganizerUser", () => {
  const membershipKey = {
    userId_hackathonId: { userId: otherUserId, hackathonId: "h1" },
  };

  test("errors on invalid form data", async () => {
    asAdmin();

    const result = await deleteOrganizerUser(
      {},
      formData({ userId: "not-a-cuid" }),
    );

    expect(result.error).toBe("The selected user is invalid.");
  });

  test("errors when trying to delete yourself", async () => {
    asAdmin();

    const result = await deleteOrganizerUser({}, formData({ userId: adminId }));

    expect(result.error).toBe("You cannot delete your own account.");
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });

  test("only removes the membership when the user belongs to other hackathons", async () => {
    asAdmin();
    membershipFindUniqueMock.mockResolvedValueOnce({ id: "m1" });
    membershipCountMock.mockResolvedValueOnce(1);

    const result = await deleteOrganizerUser(
      {},
      formData({ userId: otherUserId }),
    );

    expect(membershipFindUniqueMock).toHaveBeenCalledWith({
      where: membershipKey,
    });
    expect(membershipDeleteMock).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(userDeleteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/users");
    expect(result).toEqual({ success: true });
  });

  test("deletes the whole account when it was their last membership", async () => {
    asAdmin();
    membershipFindUniqueMock.mockResolvedValueOnce({ id: "m1" });
    membershipCountMock.mockResolvedValueOnce(0);

    await deleteOrganizerUser({}, formData({ userId: otherUserId }));

    expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: otherUserId } });
  });

  test("does nothing when the user is not a member of this hackathon", async () => {
    asAdmin();
    membershipFindUniqueMock.mockResolvedValueOnce(null);

    const result = await deleteOrganizerUser(
      {},
      formData({ userId: otherUserId }),
    );

    expect(membershipDeleteMock).not.toHaveBeenCalled();
    expect(userDeleteMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });
});
