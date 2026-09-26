import { describe, expect, test, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));

const userFindUniqueMock = vi.fn();
const budgetFindUniqueMock = vi.fn();
const budgetCreateMock = vi.fn();
const budgetUpdateMock = vi.fn();
const budgetUpdateManyMock = vi.fn();
const budgetDeleteMock = vi.fn();
const categoryFindManyMock = vi.fn();
const categoryFindUniqueMock = vi.fn();
const categoryCreateMock = vi.fn();
const categoryUpdateMock = vi.fn();
const subcategoryUpdateMock = vi.fn();
const budgetCategoryFindManyMock = vi.fn();
const budgetCategoryUpdateMock = vi.fn();
const budgetSubcategoryUpdateMock = vi.fn();

const tx = {
  budget: {
    create: (...args: unknown[]) => budgetCreateMock(...args),
    update: (...args: unknown[]) => budgetUpdateMock(...args),
    updateMany: (...args: unknown[]) => budgetUpdateManyMock(...args),
    findUnique: (...args: unknown[]) => budgetFindUniqueMock(...args),
    delete: (...args: unknown[]) => budgetDeleteMock(...args),
  },
  category: {
    findMany: (...args: unknown[]) => categoryFindManyMock(...args),
    findUnique: (...args: unknown[]) => categoryFindUniqueMock(...args),
    create: (...args: unknown[]) => categoryCreateMock(...args),
    update: (...args: unknown[]) => categoryUpdateMock(...args),
  },
  subcategory: {
    update: (...args: unknown[]) => subcategoryUpdateMock(...args),
  },
  budgetCategory: {
    findMany: (...args: unknown[]) => budgetCategoryFindManyMock(...args),
    update: (...args: unknown[]) => budgetCategoryUpdateMock(...args),
  },
  budgetSubcategory: {
    update: (...args: unknown[]) => budgetSubcategoryUpdateMock(...args),
  },
};

type TxClient = typeof tx;

const transactionMock = vi.fn(async (arg: unknown) => {
  if (typeof arg === "function") {
    return (arg as (client: TxClient) => unknown)(tx);
  }
  return Promise.all(arg as Promise<unknown>[]);
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    ...tx,
    $transaction: (...args: unknown[]) => transactionMock(args[0]),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { manageBudgets, updateBudgetAmounts } = await import(
  "@/app/organizer/budget/actions"
);

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

function signInAs(role: string) {
  authMock.mockResolvedValueOnce({ user: { id: "u1" } });
  userFindUniqueMock.mockResolvedValueOnce({ role });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("manageBudgets", () => {
  test("errors when not signed in", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await manageBudgets(
      {},
      formData({ operation: "createBudget", name: "2026" }),
    );

    expect(result.error).toBe(
      "Only admins and directors can manage budgets.",
    );
  });

  test("errors when the user is not an admin or director", async () => {
    signInAs("ORGANIZER");

    const result = await manageBudgets(
      {},
      formData({ operation: "createBudget", name: "2026" }),
    );

    expect(result.error).toBe(
      "Only admins and directors can manage budgets.",
    );
  });

  test("creates a budget from scratch with an unexpected-expenses category", async () => {
    signInAs("ADMIN");
    categoryFindUniqueMock.mockResolvedValueOnce(null);
    categoryCreateMock.mockResolvedValueOnce({
      id: "cat-unexpected",
      name: "Unexpected expenses",
    });
    categoryFindManyMock.mockResolvedValueOnce([
      {
        id: "cat1",
        name: "Food",
        subcategories: [{ id: "sub1", name: "Lunch" }],
      },
      { id: "cat2", name: "Swag", subcategories: [] },
    ]);

    const result = await manageBudgets(
      {},
      formData({ operation: "createBudget", name: "2026 draft", mode: "scratch" }),
    );

    expect(categoryCreateMock).toHaveBeenCalledWith({
      data: { name: "Unexpected expenses", budgetCents: 0 },
    });
    expect(budgetCreateMock).toHaveBeenCalledWith({
      data: {
        name: "2026 draft",
        basedOnId: null,
        categories: {
          create: [
            {
              categoryId: "cat1",
              name: "Food",
              isUnexpected: false,
              budgetCents: 0,
              subcategories: {
                create: [{ subcategoryId: "sub1", name: "Lunch", budgetCents: 0 }],
              },
            },
            {
              categoryId: "cat2",
              name: "Swag",
              isUnexpected: false,
              budgetCents: 0,
              subcategories: { create: [] },
            },
            {
              categoryId: "cat-unexpected",
              name: "Unexpected expenses",
              isUnexpected: true,
              budgetCents: 0,
            },
          ],
        },
      },
    });
    expect(result).toEqual({ success: true });
  });

  test("errors when creating with a name that is too short", async () => {
    signInAs("ADMIN");

    const result = await manageBudgets(
      {},
      formData({ operation: "createBudget", name: "a", mode: "scratch" }),
    );

    expect(result.error).toBe("Give the budget a name with at least 2 characters.");
    expect(budgetCreateMock).not.toHaveBeenCalled();
  });

  test("requires a source budget when duplicating", async () => {
    signInAs("ADMIN");

    const result = await manageBudgets(
      {},
      formData({ operation: "createBudget", name: "Copy", mode: "duplicate" }),
    );

    expect(result.error).toBe("Choose a budget to base this one on.");
  });

  test("duplicates amounts from a source budget", async () => {
    signInAs("ADMIN");
    categoryFindUniqueMock.mockResolvedValueOnce({
      id: "cat-unexpected",
      name: "Unexpected expenses",
    });
    categoryFindManyMock.mockResolvedValueOnce([
      {
        id: "cat1",
        name: "Food",
        subcategories: [{ id: "sub1", name: "Lunch" }],
      },
    ]);
    budgetCategoryFindManyMock.mockResolvedValueOnce([
      {
        categoryId: "cat1",
        isUnexpected: false,
        budgetCents: 5000,
        subcategories: [{ subcategoryId: "sub1", budgetCents: 5000 }],
      },
      {
        categoryId: "cat-unexpected",
        isUnexpected: true,
        budgetCents: 1000,
        subcategories: [],
      },
    ]);

    const result = await manageBudgets(
      {},
      formData({
        operation: "createBudget",
        name: "Reviewed",
        mode: "duplicate",
        sourceBudgetId: "budget-src",
      }),
    );

    expect(budgetCreateMock).toHaveBeenCalledWith({
      data: {
        name: "Reviewed",
        basedOnId: "budget-src",
        categories: {
          create: [
            {
              categoryId: "cat1",
              name: "Food",
              isUnexpected: false,
              budgetCents: 5000,
              subcategories: {
                create: [{ subcategoryId: "sub1", name: "Lunch", budgetCents: 5000 }],
              },
            },
            {
              categoryId: "cat-unexpected",
              name: "Unexpected expenses",
              isUnexpected: true,
              budgetCents: 1000,
            },
          ],
        },
      },
    });
    expect(result).toEqual({ success: true });
  });

  test("activates a budget and syncs its amounts to the live categories", async () => {
    signInAs("DIRECTOR");
    budgetCategoryFindManyMock.mockResolvedValueOnce([
      {
        categoryId: "cat1",
        budgetCents: 5000,
        subcategories: [{ subcategoryId: "sub1", budgetCents: 5000 }],
      },
    ]);

    const result = await manageBudgets(
      {},
      formData({ operation: "activateBudget", id: "budget1" }),
    );

    expect(budgetUpdateManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
    expect(budgetUpdateMock).toHaveBeenCalledWith({
      where: { id: "budget1" },
      data: { isActive: true },
    });
    expect(categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "cat1" },
      data: { budgetCents: 5000 },
    });
    expect(subcategoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "sub1" },
      data: { budgetCents: 5000 },
    });
    expect(result).toEqual({ success: true });
  });

  test("refuses to delete the active budget", async () => {
    signInAs("ADMIN");
    budgetFindUniqueMock.mockResolvedValueOnce({ id: "budget1", isActive: true });

    const result = await manageBudgets(
      {},
      formData({ operation: "deleteBudget", id: "budget1" }),
    );

    expect(result.error).toBe(
      "Activate a different budget before deleting this one.",
    );
    expect(budgetDeleteMock).not.toHaveBeenCalled();
  });

  test("deletes an inactive budget", async () => {
    signInAs("ADMIN");
    budgetFindUniqueMock.mockResolvedValueOnce({ id: "budget1", isActive: false });

    const result = await manageBudgets(
      {},
      formData({ operation: "deleteBudget", id: "budget1" }),
    );

    expect(budgetDeleteMock).toHaveBeenCalledWith({ where: { id: "budget1" } });
    expect(result).toEqual({ success: true });
  });
});

describe("updateBudgetAmounts", () => {
  test("errors when the user is not an admin or director", async () => {
    signInAs("ORGANIZER");

    const result = await updateBudgetAmounts(
      {},
      formData({ budgetId: "budget1", "budgetSubcategory:sub1": "10" }),
    );

    expect(result.error).toBe("Only admins and directors can update budgets.");
  });

  test("errors on a negative amount", async () => {
    signInAs("ADMIN");

    const result = await updateBudgetAmounts(
      {},
      formData({ budgetId: "budget1", "budgetSubcategory:sub1": "-5" }),
    );

    expect(result.error).toBe("Budget amounts cannot be negative.");
  });

  test("updates subcategories and recomputes the parent category total", async () => {
    signInAs("ADMIN");
    budgetFindUniqueMock.mockResolvedValueOnce({ id: "budget1", isActive: false });
    budgetCategoryFindManyMock.mockResolvedValueOnce([
      {
        id: "budgetcat1",
        budgetCents: 9999,
        subcategories: [
          { id: "budgetsub1", budgetCents: 2000 },
          { id: "budgetsub2", budgetCents: 1000 },
        ],
      },
    ]);

    const result = await updateBudgetAmounts(
      {},
      formData({
        budgetId: "budget1",
        "budgetSubcategory:budgetsub1": "20.00",
        "budgetSubcategory:budgetsub2": "10.00",
      }),
    );

    expect(budgetSubcategoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "budgetsub1" },
      data: { budgetCents: 2000 },
    });
    expect(budgetCategoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "budgetcat1" },
      data: { budgetCents: 3000 },
    });
    expect(result).toEqual({ success: true });
  });

  test("syncs live categories when editing the active budget", async () => {
    signInAs("ADMIN");
    budgetFindUniqueMock.mockResolvedValueOnce({ id: "budget1", isActive: true });
    budgetCategoryFindManyMock.mockResolvedValue([
      {
        id: "budgetcat-unexpected",
        categoryId: "cat-unexpected",
        budgetCents: 500,
        subcategories: [],
      },
    ]);

    const result = await updateBudgetAmounts(
      {},
      formData({ budgetId: "budget1", "budgetCategory:budgetcat-unexpected": "5.00" }),
    );

    expect(budgetCategoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "budgetcat-unexpected" },
      data: { budgetCents: 500 },
    });
    expect(categoryUpdateMock).toHaveBeenCalledWith({
      where: { id: "cat-unexpected" },
      data: { budgetCents: 500 },
    });
    expect(result).toEqual({ success: true });
  });
});
