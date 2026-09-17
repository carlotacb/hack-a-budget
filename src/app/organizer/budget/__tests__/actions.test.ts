import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const findUniqueMock = vi.fn();
const categoryUpdateMock = vi.fn();
const subcategoryUpdateMock = vi.fn();
const transactionMock = vi.fn(
  async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
);
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    category: { update: (...args: unknown[]) => categoryUpdateMock(...args) },
    subcategory: {
      update: (...args: unknown[]) => subcategoryUpdateMock(...args),
    },
    $transaction: (...args: unknown[]) =>
      transactionMock(...(args as [unknown[]])),
  },
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { updateBudgets } = await import("@/app/organizer/budget/actions");

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateBudgets", () => {
  test("errors when the user is not an admin or director", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ORGANIZER" });

    const result = await updateBudgets({}, formData({ "category:c1": "10" }));

    expect(result.error).toBe(
      "Only admins and directors can update budgets.",
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test("errors when not signed in", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await updateBudgets({}, formData({ "category:c1": "10" }));

    expect(result.error).toBe(
      "Only admins and directors can update budgets.",
    );
  });

  test("ignores unrelated form keys", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });

    const result = await updateBudgets({}, formData({ unrelated: "5" }));

    expect(transactionMock).toHaveBeenCalledWith([]);
    expect(result).toEqual({ success: true });
  });

  test("errors on a negative amount", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });

    const result = await updateBudgets({}, formData({ "category:c1": "-5" }));

    expect(result.error).toBe("Budget amounts cannot be negative.");
  });

  test("errors on an amount that is too large", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "ADMIN" });

    const result = await updateBudgets(
      {},
      formData({ "category:c1": "999999999" }),
    );

    expect(result.error).toBe("Budget amount is too large.");
  });

  test("updates category and subcategory budgets and revalidates", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({ role: "DIRECTOR" });

    const result = await updateBudgets(
      {},
      formData({ "category:c1": "10.5", "subcategory:s1": "20" }),
    );

    expect(categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { budgetCents: 1050 },
    });
    expect(subcategoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { budgetCents: 2000 },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer");
    expect(revalidatePathMock).toHaveBeenCalledWith("/organizer/budget");
    expect(result).toEqual({ success: true });
  });
});
