import { describe, expect, test, vi, beforeEach } from "vitest";

class AuthError extends Error {}
vi.mock("next-auth", () => ({ AuthError }));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const signInMock = vi.fn();
const signOutMock = vi.fn();
const authMock = vi.fn<() => Promise<unknown>>(async () => null);
vi.mock("@/auth", () => ({
  signIn: (...args: unknown[]) => signInMock(...(args as [unknown])),
  signOut: (...args: unknown[]) => signOutMock(...args),
  auth: () => authMock(),
}));

const setActiveHackathonMock = vi.fn();
vi.mock("@/lib/current-hackathon", () => ({
  setActiveHackathon: (...args: unknown[]) => setActiveHackathonMock(...args),
}));

const compareMock = vi.fn(async () => false);
vi.mock("bcryptjs", () => ({
  hash: vi.fn(async () => "hashed-password"),
  compare: (...args: unknown[]) => compareMock(...(args as [])),
}));

const userFindUniqueMock = vi.fn();
const userCreateMock = vi.fn();
const hackathonCreateMock = vi.fn();
const membershipCreateMock = vi.fn();
const membershipUpsertMock = vi.fn();
const departmentCreateMock = vi.fn();
const categoryCreateMock = vi.fn();
const travelSettingsCreateMock = vi.fn();
const hackerInviteFindUniqueMock = vi.fn();
const hackerInviteUpdateMock = vi.fn();

const tx = {
  user: { findUnique: userFindUniqueMock, create: userCreateMock },
  hackathon: { create: hackathonCreateMock },
  hackathonMembership: {
    create: membershipCreateMock,
    upsert: membershipUpsertMock,
  },
  department: { create: departmentCreateMock },
  category: { create: categoryCreateMock },
  travelEventSettings: { create: travelSettingsCreateMock },
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
  authMock.mockResolvedValue(null);
  compareMock.mockResolvedValue(false);
  hackathonCreateMock.mockResolvedValue({ id: "hackathon-1" });
  departmentCreateMock.mockResolvedValue({ id: "general-dep-id" });
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
  };

  function registerFormData(fields: Record<string, string> = validFields) {
    const fd = formData(fields);
    fd.append("departments", "Design");
    fd.append("departments", "Logistics");
    fd.append("categories", "Catering");
    return fd;
  }

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

  test("returns an error when the admin email exists and is not verified", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "1",
      passwordHash: "stored-hash",
    });

    const result = await registerHackathon({}, registerFormData());

    expect(result.error).toBe(
      'An account with this email already exists. Use "Check email" to confirm it, or enter its password to add this hackathon to it.',
    );
    expect(hackathonCreateMock).not.toHaveBeenCalled();
  });

  test("adds the hackathon to an existing account when the password matches", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "existing-user",
      passwordHash: "stored-hash",
    });
    compareMock.mockResolvedValueOnce(true);
    signInMock.mockResolvedValueOnce(undefined);

    const result = await registerHackathon({}, registerFormData());

    expect(userCreateMock).not.toHaveBeenCalled();
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "existing-user",
        hackathonId: "hackathon-1",
        role: "ADMIN",
      },
    });
    expect(setActiveHackathonMock).toHaveBeenCalledWith("hackathon-1");
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "new@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
    expect(result).toEqual({});
  });

  test("creates the hackathon, admin, and initial metadata, then signs in", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    userCreateMock.mockResolvedValueOnce({ id: "user-1" });
    signInMock.mockResolvedValueOnce(undefined);

    const result = await registerHackathon({}, registerFormData());

    expect(hackathonCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "BudgetHack 2026",
        travelReimbursementEnabled: true,
      }),
    });
    expect(userCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        name: "Jane Doe",
      }),
    });
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: { userId: "user-1", hackathonId: "hackathon-1", role: "ADMIN" },
    });
    // General + the two listed departments.
    expect(departmentCreateMock).toHaveBeenCalledTimes(3);
    expect(categoryCreateMock).toHaveBeenCalledWith({
      data: {
        hackathonId: "hackathon-1",
        name: "Catering",
        departmentId: "general-dep-id",
      },
    });
    expect(travelSettingsCreateMock).toHaveBeenCalledWith({
      data: { hackathonId: "hackathon-1" },
    });
    expect(setActiveHackathonMock).toHaveBeenCalledWith("hackathon-1");
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "new@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
    expect(result).toEqual({});
  });

  test("creates a hackathon for a signed-in user without asking for a profile", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    userFindUniqueMock.mockResolvedValueOnce({ id: "user-1" });

    await expect(
      registerHackathon({}, formData({ hackathonName: "Second Hack" })),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(userCreateMock).not.toHaveBeenCalled();
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: { userId: "user-1", hackathonId: "hackathon-1", role: "ADMIN" },
    });
    expect(setActiveHackathonMock).toHaveBeenCalledWith("hackathon-1");
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

  const invite = {
    token: "good-token",
    hackathonId: "hackathon-1",
    usedAt: null,
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
    hackerInviteFindUniqueMock.mockResolvedValue(invite);
    userFindUniqueMock.mockResolvedValueOnce(null);
    userCreateMock.mockResolvedValueOnce({ id: "user-1" });
    signInMock.mockResolvedValueOnce(undefined);

    const result = await registerWithInvite(
      "good-token",
      {},
      formData(validFields),
    );

    expect(userCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "hacker@example.com" }),
    });
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: { userId: "user-1", hackathonId: "hackathon-1", role: "HACKER" },
    });
    expect(hackerInviteUpdateMock).toHaveBeenCalledWith({
      where: { token: "good-token" },
      data: expect.objectContaining({ usedById: "user-1" }),
    });
    expect(setActiveHackathonMock).toHaveBeenCalledWith("hackathon-1");
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "hacker@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
    expect(result).toEqual({});
  });

  test("adds the invite's hackathon to a signed-in user", async () => {
    hackerInviteFindUniqueMock.mockResolvedValue(invite);
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    userFindUniqueMock.mockResolvedValueOnce({ id: "user-1" });

    await expect(
      registerWithInvite("good-token", {}, formData({})),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");

    expect(userCreateMock).not.toHaveBeenCalled();
    expect(membershipUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          userId: "user-1",
          hackathonId: "hackathon-1",
          role: "HACKER",
        },
      }),
    );
    expect(hackerInviteUpdateMock).toHaveBeenCalledWith({
      where: { token: "good-token" },
      data: expect.objectContaining({ usedById: "user-1" }),
    });
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
