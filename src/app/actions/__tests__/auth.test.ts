import { describe, expect, test, vi, beforeEach } from "vitest";

class AuthError extends Error {}
vi.mock("next-auth", () => ({ AuthError }));

const signInMock = vi.fn();
const authMock = vi.fn(async () => null);
vi.mock("@/auth", () => ({
  signIn: (...args: unknown[]) => signInMock(...(args as [unknown])),
  auth: () => authMock(),
}));

const userFindUniqueMock = vi.fn();
const userCreateMock = vi.fn();
const hackathonFindUniqueMock = vi.fn();
const hackathonCreateMock = vi.fn();
const departmentUpsertMock = vi.fn();
const departmentFindManyMock = vi.fn(async () => []);
const departmentCreateMock = vi.fn();
const categoryCreateMock = vi.fn();
const hackerInviteFindUniqueMock = vi.fn();
const hackerInviteUpdateMock = vi.fn();

const tx = {
  user: { findUnique: userFindUniqueMock, create: userCreateMock },
  hackathon: {
    findUnique: hackathonFindUniqueMock,
    create: hackathonCreateMock,
  },
  department: {
    upsert: departmentUpsertMock,
    findMany: departmentFindManyMock,
    create: departmentCreateMock,
  },
  category: { create: categoryCreateMock },
  hackerInvite: {
    findUnique: hackerInviteFindUniqueMock,
    update: hackerInviteUpdateMock,
  },
};

const transactionMock = vi.fn(async (callback: (tx: unknown) => unknown) =>
  callback(tx),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...tx,
    $transaction: (...args: Parameters<typeof transactionMock>) =>
      transactionMock(...args),
  },
}));

vi.mock("bcryptjs", () => ({ hash: vi.fn(async () => "hashed-password") }));

const {
  login,
  registerHackathon,
  registerWithInvite,
  loginWithGoogle,
} = await import("@/app/actions/auth");
const { generateInviteToken } = await import("@/lib/hackathon");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  departmentFindManyMock.mockResolvedValue([]);
  hackathonFindUniqueMock.mockResolvedValue(null);
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

describe("registerHackathon", () => {
  const validFields = {
    hackathonName: "BudgetHack 2026",
    email: "New@Example.com",
    password: "password123",
    name: "Jane Doe",
    gender: "WOMAN",
    diet: "VEGETARIAN",
    tshirtSize: "M",
    travelReimbursementEnabled: "on",
    departments: "Design, Logistics",
    categories: "Catering",
  };

  test("returns an error when a hackathon already exists", async () => {
    hackathonFindUniqueMock.mockResolvedValue({ id: "hackathon" });

    const result = await registerHackathon({}, formData(validFields));

    expect(result.error).toBe("A hackathon has already been registered.");
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  test("returns a validation error for invalid fields", async () => {
    const result = await registerHackathon(
      {},
      formData({ ...validFields, hackathonName: "A" }),
    );

    expect(result.error).toBe(
      "Hackathon name must be at least 2 characters.",
    );
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  test("returns an error when the admin email already exists", async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: "1" });

    const result = await registerHackathon({}, formData(validFields));

    expect(result.error).toBe("An account with this email already exists.");
    expect(hackathonCreateMock).not.toHaveBeenCalled();
  });

  test("creates the hackathon, admin, and initial metadata, then signs in", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    signInMock.mockResolvedValueOnce(undefined);

    const result = await registerHackathon({}, formData(validFields));

    expect(hackathonCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "hackathon",
        name: "BudgetHack 2026",
        travelReimbursementEnabled: true,
      }),
    });
    expect(userCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        name: "Jane Doe",
        role: "ADMIN",
      }),
    });
    expect(departmentCreateMock).toHaveBeenCalledTimes(2);
    expect(categoryCreateMock).toHaveBeenCalledWith({
      data: { name: "Catering" },
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "new@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
    expect(result).toEqual({});
  });
});

describe("registerWithInvite", () => {
  const validFields = {
    email: "Hacker@Example.com",
    password: "password123",
    name: "Jane Doe",
    gender: "WOMAN",
    diet: "VEGETARIAN",
    tshirtSize: "M",
  };

  test("returns an error for a missing or used invite", async () => {
    hackerInviteFindUniqueMock.mockResolvedValueOnce(null);

    const result = await registerWithInvite(
      "bad-token",
      {},
      formData(validFields),
    );

    expect(result.error).toBe(
      "This invite link is invalid or has already been used.",
    );
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  test("creates the hacker and marks the invite used", async () => {
    hackerInviteFindUniqueMock.mockResolvedValue({
      token: "good-token",
      usedAt: null,
    });
    userFindUniqueMock.mockResolvedValueOnce(null);
    userCreateMock.mockResolvedValueOnce({ id: "user-1" });
    signInMock.mockResolvedValueOnce(undefined);

    const result = await registerWithInvite(
      "good-token",
      {},
      formData(validFields),
    );

    expect(userCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "hacker@example.com",
        role: "HACKER",
      }),
    });
    expect(hackerInviteUpdateMock).toHaveBeenCalledWith({
      where: { token: "good-token" },
      data: expect.objectContaining({ usedById: "user-1" }),
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "hacker@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
    expect(result).toEqual({});
  });
});

describe("generateInviteToken", () => {
  test("generates a non-empty, url-safe token", () => {
    const token = generateInviteToken();

    expect(token.length).toBeGreaterThan(10);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
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
