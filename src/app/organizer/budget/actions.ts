"use server";

import { Prisma, type PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export type BudgetFormState = {
  error?: string;
  success?: boolean;
};

export const UNEXPECTED_CATEGORY_NAME = "Unexpected expenses";

const amountSchema = z.coerce
  .number()
  .min(0, "Budget amounts cannot be negative.")
  .max(100_000_000, "Budget amount is too large.");

function revalidateBudgetPaths() {
  revalidatePath("/organizer");
  revalidatePath("/organizer/budget");
}

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/** The "Unexpected expenses" category is a real Category so it can also
 * hold real expenses, but it's excluded from the automatic per-category
 * budget list and always injected as its own plan row instead. */
async function getOrCreateUnexpectedCategory(tx: Tx) {
  const existing = await tx.category.findUnique({
    where: { name: UNEXPECTED_CATEGORY_NAME },
  });
  if (existing) return existing;

  return tx.category.create({
    data: { name: UNEXPECTED_CATEGORY_NAME, budgetCents: 0 },
  });
}

/** Ensures the "Unexpected expenses" category exists, for pages (like
 * metadata settings) that need to show/protect it outside a budget
 * transaction. */
export async function ensureUnexpectedCategory() {
  return getOrCreateUnexpectedCategory(prisma);
}

/** Copies a budget plan's amounts onto the live Category/Subcategory
 * budgets so the rest of the app (dashboard, expense forms) tracks
 * against whichever plan is active. */
async function syncActiveBudget(tx: Tx, budgetId: string) {
  const categories = await tx.budgetCategory.findMany({
    where: { budgetId },
    include: { subcategories: true },
  });

  for (const category of categories) {
    if (category.categoryId) {
      await tx.category.update({
        where: { id: category.categoryId },
        data: { budgetCents: category.budgetCents },
      });
    }
    for (const subcategory of category.subcategories) {
      if (subcategory.subcategoryId) {
        await tx.subcategory.update({
          where: { id: subcategory.subcategoryId },
          data: { budgetCents: subcategory.budgetCents },
        });
      }
    }
  }
}

/** Recomputes a budget category's total from the sum of its subcategories
 * (categories with no subcategories keep whatever was set directly). */
async function recalculateBudgetCategoryTotal(tx: Tx, budgetCategoryId: string) {
  const category = await tx.budgetCategory.findUnique({
    where: { id: budgetCategoryId },
    include: { subcategories: true },
  });
  if (!category || category.subcategories.length === 0) return;

  const total = category.subcategories.reduce(
    (sum, subcategory) => sum + subcategory.budgetCents,
    0,
  );
  if (total !== category.budgetCents) {
    await tx.budgetCategory.update({
      where: { id: budgetCategoryId },
      data: { budgetCents: total },
    });
  }
}

async function createBudgetPlan(
  name: string,
  sourceBudgetId: string | null,
): Promise<BudgetFormState> {
  await prisma.$transaction(async (tx) => {
    const unexpectedCategory = await getOrCreateUnexpectedCategory(tx);

    const categories = await tx.category.findMany({
      where: { active: true, id: { not: unexpectedCategory.id } },
      include: { subcategories: { where: { active: true } } },
      orderBy: { name: "asc" },
    });

    let sourceUnexpectedCents = 0;
    const sourceByCategoryId = new Map<
      string,
      { budgetCents: number; subcategoryCents: Map<string, number> }
    >();

    if (sourceBudgetId) {
      const sourceCategories = await tx.budgetCategory.findMany({
        where: { budgetId: sourceBudgetId },
        include: { subcategories: true },
      });

      for (const category of sourceCategories) {
        if (category.isUnexpected) {
          sourceUnexpectedCents = category.budgetCents;
          continue;
        }
        if (!category.categoryId) continue;
        sourceByCategoryId.set(category.categoryId, {
          budgetCents: category.budgetCents,
          subcategoryCents: new Map(
            category.subcategories
              .filter((s) => s.subcategoryId)
              .map((s) => [s.subcategoryId as string, s.budgetCents]),
          ),
        });
      }
    }

    await tx.budget.create({
      data: {
        name,
        basedOnId: sourceBudgetId,
        categories: {
          create: [
            ...categories.map((category) => {
              const source = sourceByCategoryId.get(category.id);
              const subcategories = category.subcategories.map(
                (subcategory) => ({
                  subcategoryId: subcategory.id,
                  name: subcategory.name,
                  budgetCents:
                    source?.subcategoryCents.get(subcategory.id) ?? 0,
                }),
              );
              const budgetCents =
                subcategories.length > 0
                  ? subcategories.reduce((t, s) => t + s.budgetCents, 0)
                  : (source?.budgetCents ?? 0);

              return {
                categoryId: category.id,
                name: category.name,
                isUnexpected: false,
                budgetCents,
                subcategories: { create: subcategories },
              };
            }),
            {
              categoryId: unexpectedCategory.id,
              name: unexpectedCategory.name,
              isUnexpected: true,
              budgetCents: sourceUnexpectedCents,
            },
          ],
        },
      },
    });
  });

  revalidateBudgetPaths();
  return { success: true };
}

/** New categories/subcategories only exist going forward, so they're added
 * to the currently active budget plan (if any) rather than every draft.
 * Keeps the active plan's shape in sync with what expenses can be logged
 * against, without silently mutating budgets someone else is drafting. */
export async function syncNewCategoryToActiveBudget(
  categoryId: string,
  name: string,
) {
  const activeBudget = await prisma.budget.findFirst({
    where: { isActive: true },
  });
  if (!activeBudget) return;

  const existing = await prisma.budgetCategory.findFirst({
    where: { budgetId: activeBudget.id, categoryId },
  });
  if (existing) return;

  await prisma.budgetCategory.create({
    data: {
      budgetId: activeBudget.id,
      categoryId,
      name,
      budgetCents: 0,
      isUnexpected: false,
    },
  });
}

export async function syncNewSubcategoryToActiveBudget(
  subcategoryId: string,
  categoryId: string,
  name: string,
) {
  const activeBudget = await prisma.budget.findFirst({
    where: { isActive: true },
  });
  if (!activeBudget) return;

  await prisma.$transaction(async (tx) => {
    let budgetCategory = await tx.budgetCategory.findFirst({
      where: { budgetId: activeBudget.id, categoryId },
    });

    if (!budgetCategory) {
      const category = await tx.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) return;

      budgetCategory = await tx.budgetCategory.create({
        data: {
          budgetId: activeBudget.id,
          categoryId,
          name: category.name,
          budgetCents: 0,
          isUnexpected: false,
        },
      });
    }

    const existingSubcategory = await tx.budgetSubcategory.findFirst({
      where: { budgetCategoryId: budgetCategory.id, subcategoryId },
    });
    if (existingSubcategory) return;

    await tx.budgetSubcategory.create({
      data: {
        budgetCategoryId: budgetCategory.id,
        subcategoryId,
        name,
        budgetCents: 0,
      },
    });

    await recalculateBudgetCategoryTotal(tx, budgetCategory.id);
    await syncActiveBudget(tx, activeBudget.id);
  });
}

export async function manageBudgets(
  _state: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  if (!(await getOrganizerId(["ADMIN", "DIRECTOR"]))) {
    return { error: "Only admins and directors can manage budgets." };
  }

  const operation = formData.get("operation");

  if (operation === "createBudget") {
    const name = z.string().trim().min(2).safeParse(formData.get("name"));
    if (!name.success) {
      return { error: "Give the budget a name with at least 2 characters." };
    }

    const mode = formData.get("mode");
    const sourceBudgetId = formData.get("sourceBudgetId");

    if (mode === "duplicate") {
      if (typeof sourceBudgetId !== "string" || !sourceBudgetId) {
        return { error: "Choose a budget to base this one on." };
      }
      return createBudgetPlan(name.data, sourceBudgetId);
    }

    return createBudgetPlan(name.data, null);
  }

  if (operation === "activateBudget") {
    const id = formData.get("id");
    if (typeof id !== "string" || !id) {
      return { error: "That budget no longer exists." };
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.budget.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
        await tx.budget.update({
          where: { id },
          data: { isActive: true },
        });
        await syncActiveBudget(tx, id);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return { error: "That budget no longer exists." };
      }
      throw error;
    }

    revalidateBudgetPaths();
    return { success: true };
  }

  if (operation === "deleteBudget") {
    const id = formData.get("id");
    if (typeof id !== "string" || !id) {
      return { error: "That budget no longer exists." };
    }

    const budget = await prisma.budget.findUnique({ where: { id } });
    if (!budget) {
      return { error: "That budget no longer exists." };
    }
    if (budget.isActive) {
      return { error: "Activate a different budget before deleting this one." };
    }

    await prisma.budget.delete({ where: { id } });
    revalidateBudgetPaths();
    return { success: true };
  }

  return { error: "Unknown budget operation." };
}

export async function updateBudgetAmounts(
  _state: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  if (!(await getOrganizerId(["ADMIN", "DIRECTOR"]))) {
    return { error: "Only admins and directors can update budgets." };
  }

  const budgetId = formData.get("budgetId");
  if (typeof budgetId !== "string" || !budgetId) {
    return { error: "That budget no longer exists." };
  }

  const subcategoryUpdates: { id: string; budgetCents: number }[] = [];
  const categoryUpdates: { id: string; budgetCents: number }[] = [];

  for (const [key, value] of formData.entries()) {
    const [type, id] = key.split(":");
    if ((type !== "budgetCategory" && type !== "budgetSubcategory") || !id) {
      continue;
    }

    const parsed = amountSchema.safeParse(value);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const budgetCents = Math.round(parsed.data * 100);
    if (type === "budgetCategory") {
      categoryUpdates.push({ id, budgetCents });
    } else {
      subcategoryUpdates.push({ id, budgetCents });
    }
  }

  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
  if (!budget) {
    return { error: "That budget no longer exists." };
  }

  await prisma.$transaction(async (tx) => {
    for (const update of subcategoryUpdates) {
      await tx.budgetSubcategory.update({
        where: { id: update.id },
        data: { budgetCents: update.budgetCents },
      });
    }
    for (const update of categoryUpdates) {
      await tx.budgetCategory.update({
        where: { id: update.id },
        data: { budgetCents: update.budgetCents },
      });
    }

    // Categories with subcategories always derive their total automatically.
    const categories = await tx.budgetCategory.findMany({
      where: { budgetId },
      include: { subcategories: true },
    });
    for (const category of categories) {
      if (category.subcategories.length === 0) continue;
      const total = category.subcategories.reduce(
        (sum, subcategory) => sum + subcategory.budgetCents,
        0,
      );
      if (total !== category.budgetCents) {
        await tx.budgetCategory.update({
          where: { id: category.id },
          data: { budgetCents: total },
        });
      }
    }

    if (budget.isActive) {
      await syncActiveBudget(tx, budgetId);
    }
  });

  revalidateBudgetPaths();
  return { success: true };
}
