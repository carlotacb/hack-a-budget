import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const findUniqueMock = vi.fn();
const updateManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateUserRole", () => {
  test("errors when not signed in", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER" }),
    );

    expect(result.error).toBe("Sign in to manage users.");
  });

  test("errors when the current user is not an admin", async () => {
    authMock.mockResolvedValueOnce({ user: { id: adminId } });
    findUniqueMock.mockResolvedValueOnce({ role: "ORGANIZER" });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER" }),
    );

    expect(result.error).toBe("Only admins can change user roles.");
  });

  test("errors on invalid form data", async () => {
    authMock.mockResolvedValueOnce({ user: { id: adminId } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });

    const result = await updateUserRole(
      {},
      formData({ userId: "not-a-cuid", role: "ORGANIZER" }),
    );

    expect(result.error).toBe("The selected user is invalid.");
  });

  test("errors when trying to change your own role", async () => {
    authMock.mockResolvedValueOnce({ user: { id: adminId } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });

    const result = await updateUserRole(
      {},
      formData({ userId: adminId, role: "ORGANIZER" }),
    );

    expect(result.error).toBe("You cannot change your own role.");
  });

  test("errors when the user already has that role or no longer exists", async () => {
    authMock.mockResolvedValueOnce({ user: { id: adminId } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    updateManyMock.mockResolvedValueOnce({ count: 0 });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER" }),
    );

    expect(result.error).toBe(
      "This user already has that role or no longer exists.",
    );
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("updates the role and revalidates on success", async () => {
    authMock.mockResolvedValueOnce({ user: { id: adminId } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });
    updateManyMock.mockResolvedValueOnce({ count: 1 });

    const result = await updateUserRole(
      {},
      formData({ userId: otherUserId, role: "ORGANIZER" }),
    );

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: otherUserId, role: { not: "ORGANIZER" } },
      data: { role: "ORGANIZER" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/users");
    expect(result).toEqual({ success: true });
  });
});
