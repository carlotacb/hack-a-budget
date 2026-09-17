import { describe, expect, test, vi, beforeEach } from "vitest";

class AuthError extends Error {}
vi.mock("next-auth", () => ({ AuthError }));

const signInMock = vi.fn();
vi.mock("@/auth", () => ({ signIn: (...args: unknown[]) => signInMock(...args) }));

const findUniqueMock = vi.fn();
const createMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

vi.mock("bcryptjs", () => ({ hash: vi.fn(async () => "hashed-password") }));

const { login, register, loginWithGoogle } = await import("@/app/actions/auth");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login", () => {
  test("returns a validation error for an invalid email", async () => {
    const result = await login(
      {},
      formData({ email: "not-an-email", password: "password123" }),
    );

    expect(result.error).toBe("Enter a valid email address.");
    expect(signInMock).not.toHaveBeenCalled();
  });

  test("returns a validation error for a short password", async () => {
    const result = await login(
      {},
      formData({ email: "user@example.com", password: "short" }),
    );

    expect(result.error).toBe("Password must be at least 8 characters.");
  });

  test("signs in with lowercased email on success", async () => {
    signInMock.mockResolvedValueOnce(undefined);

    const result = await login(
      {},
      formData({ email: "User@Example.com", password: "password123" }),
    );

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
    expect(result).toEqual({});
  });

  test("returns a friendly error on AuthError", async () => {
    signInMock.mockRejectedValueOnce(new AuthError("bad credentials"));

    const result = await login(
      {},
      formData({ email: "user@example.com", password: "password123" }),
    );

    expect(result.error).toBe("Email or password is incorrect.");
  });

  test("rethrows non-AuthError errors", async () => {
    signInMock.mockRejectedValueOnce(new Error("boom"));

    await expect(
      login({}, formData({ email: "user@example.com", password: "password123" })),
    ).rejects.toThrow("boom");
  });
});

describe("register", () => {
  const validFields = {
    email: "New@Example.com",
    password: "password123",
    name: "Jane Doe",
    gender: "WOMAN",
    city: "Barcelona",
    major: "CS",
  };

  test("returns a validation error for invalid fields", async () => {
    const result = await register(
      {},
      formData({ ...validFields, name: "J" }),
    );

    expect(result.error).toBe("Complete name must be at least 2 characters.");
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  test("returns an error when the user already exists", async () => {
    findUniqueMock.mockResolvedValueOnce({ id: "1" });

    const result = await register({}, formData(validFields));

    expect(result.error).toBe("An account with this email already exists.");
    expect(createMock).not.toHaveBeenCalled();
  });

  test("creates the user and signs in on success", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({ id: "1" });
    signInMock.mockResolvedValueOnce(undefined);

    const result = await register({}, formData(validFields));

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        name: "Jane Doe",
        role: "HACKER",
      }),
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "new@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
    expect(result).toEqual({});
  });

  test("handles a race-condition duplicate email from prisma", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const { Prisma } = await import("@prisma/client");
    const prismaError = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "1",
    });
    createMock.mockRejectedValueOnce(prismaError);

    const result = await register({}, formData(validFields));

    expect(result.error).toBe("An account with this email already exists.");
    expect(signInMock).not.toHaveBeenCalled();
  });

  test("rethrows unexpected prisma errors", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createMock.mockRejectedValueOnce(new Error("db down"));

    await expect(register({}, formData(validFields))).rejects.toThrow(
      "db down",
    );
  });
});

describe("loginWithGoogle", () => {
  test("signs in with google", async () => {
    signInMock.mockResolvedValueOnce(undefined);

    await loginWithGoogle();

    expect(signInMock).toHaveBeenCalledWith("google", {
      redirectTo: "/dashboard",
    });
  });
});
