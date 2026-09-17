import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const updateManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { updateMany: (...args: unknown[]) => updateManyMock(...args) } },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const { updateProfile } = await import("@/app/profile/actions");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validFields = {
  name: "Jane Doe",
  gender: "WOMAN",
  city: "Barcelona",
  major: "CS",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateProfile", () => {
  test("errors when not signed in", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await updateProfile({}, formData(validFields));

    expect(result.error).toBe("Sign in to update your profile.");
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  test("errors on invalid fields", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });

    const result = await updateProfile({}, formData({ ...validFields, city: "B" }));

    expect(result.error).toBe("City must be at least 2 characters.");
  });

  test("errors when the account cannot be found", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    updateManyMock.mockResolvedValueOnce({ count: 0 });

    const result = await updateProfile({}, formData(validFields));

    expect(result.error).toBe("Your account could not be found.");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("updates the profile and revalidates paths on success", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    updateManyMock.mockResolvedValueOnce({ count: 1 });

    const result = await updateProfile({}, formData(validFields));

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        name: "Jane Doe",
        gender: "WOMAN",
        city: "Barcelona",
        major: "CS",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
    expect(revalidatePathMock).toHaveBeenCalledWith("/hacker");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer");
    expect(result).toEqual({ success: true });
  });
});
