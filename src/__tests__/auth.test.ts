/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi, beforeEach } from "vitest";

const findUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

const compareMock = vi.fn();
vi.mock("bcryptjs", () => ({ compare: (...args: unknown[]) => compareMock(...args) }));

vi.mock("next-auth", () => ({ default: vi.fn(() => ({})) }));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/google", () => ({ default: vi.fn() }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn() }));

const { authorizeCredentials, jwtCallback, sessionCallback } = await import(
  "@/auth"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authorizeCredentials", () => {
  test("returns null for invalid credentials shape", async () => {
    const result = await authorizeCredentials({
      email: "not-an-email",
      password: "short",
    });

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  test("returns null when user is not found", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const result = await authorizeCredentials({
      email: "user@example.com",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
  });

  test("returns null when user has no passwordHash", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "1",
      email: "user@example.com",
      passwordHash: null,
    });

    const result = await authorizeCredentials({
      email: "user@example.com",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(compareMock).not.toHaveBeenCalled();
  });

  test("returns null when password does not match", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "1",
      email: "user@example.com",
      passwordHash: "hashed",
    });
    compareMock.mockResolvedValueOnce(false);

    const result = await authorizeCredentials({
      email: "user@example.com",
      password: "wrong-password",
    });

    expect(result).toBeNull();
  });

  test("returns the user object on correct password, lowercasing email lookup", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "1",
      email: "user@example.com",
      name: "Jane Doe",
      image: "avatar.png",
      role: "HACKER",
      passwordHash: "hashed",
    });
    compareMock.mockResolvedValueOnce(true);

    const result = await authorizeCredentials({
      email: "User@Example.com",
      password: "password123",
    });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(compareMock).toHaveBeenCalledWith("password123", "hashed");
    expect(result).toEqual({
      id: "1",
      email: "user@example.com",
      name: "Jane Doe",
      image: "avatar.png",
      role: "HACKER",
    });
  });
});

describe("jwtCallback", () => {
  test("sets token.role from user on sign-in, then overwrites from db lookup", async () => {
    findUniqueMock.mockResolvedValueOnce({
      role: "ORGANIZER",
      name: "DB Name",
      email: "db@example.com",
    });

    const token = { sub: "user-1" } as Record<string, unknown>;
    const result = await jwtCallback({
      token,
      user: { role: "HACKER" },
    } as any);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { role: true, name: true, email: true },
    });
    expect(result.role).toBe("ORGANIZER");
    expect(result.name).toBe("DB Name");
    expect(result.email).toBe("db@example.com");
  });

  test("sets undefined role/name/email when token.sub exists but dbUser lookup returns null", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const token = { sub: "user-1", role: "HACKER" } as Record<
      string,
      unknown
    >;
    const result = await jwtCallback({ token, user: undefined } as any);

    expect(result.role).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.email).toBeUndefined();
  });

  test("does not query prisma when token.sub is missing", async () => {
    const token = {} as Record<string, unknown>;
    const result = await jwtCallback({ token, user: undefined } as any);

    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(result).toBe(token);
  });
});

describe("sessionCallback", () => {
  function makeSession() {
    return { user: {} as Record<string, unknown> };
  }

  test("sets session.user.id from token.sub", () => {
    const session = makeSession();
    const result = sessionCallback({
      session,
      token: { sub: "user-1" },
    } as any);

    expect(result.user.id).toBe("user-1");
  });

  test("does not set session.user.id when token.sub is missing", () => {
    const session = makeSession();
    const result = sessionCallback({ session, token: {} } as any);

    expect(result.user.id).toBeUndefined();
  });

  test.each(["HACKER", "ORGANIZER", "DIRECTOR", "ADMIN"])(
    "copies valid role %s onto session.user.role",
    (role) => {
      const session = makeSession();
      const result = sessionCallback({
        session,
        token: { sub: "user-1", role },
      } as any);

      expect(result.user.role).toBe(role);
    },
  );

  test("leaves session.user.role unset for an unknown role", () => {
    const session = makeSession();
    const result = sessionCallback({
      session,
      token: { sub: "user-1", role: "SOMETHING_ELSE" },
    } as any);

    expect(result.user.role).toBeUndefined();
  });

  test("leaves session.user.role unset when token.role is undefined", () => {
    const session = makeSession();
    const result = sessionCallback({
      session,
      token: { sub: "user-1" },
    } as any);

    expect(result.user.role).toBeUndefined();
  });
});
