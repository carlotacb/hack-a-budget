"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export type BudgetFormState = {
  error?: string;
  success?: boolean;
};

const amountSchema = z.coerce
  .number()
  .min(0, "Budget amounts cannot be negative.")
  .max(100_000_000, "Budget amount is too large.");

export async function updateBudgets(
  _state: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  if (!(await getOrganizerId(["ADMIN", "DIRECTOR"]))) {
    return { error: "Only admins and directors can update budgets." };
  }

  const updates: {
    type: "category" | "subcategory";
    id: string;
    budgetCents: number;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    const [type, id] = key.split(":");

    if ((type !== "category" && type !== "subcategory") || !id) {
      continue;
    }

    const parsed = amountSchema.safeParse(value);

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    updates.push({
      type,
      id,
      budgetCents: Math.round(parsed.data * 100),
    });
  }

  await prisma.$transaction(
    updates.map((update) =>
      update.type === "category"
        ? prisma.category.update({
            where: { id: update.id },
            data: { budgetCents: update.budgetCents },
          })
        : prisma.subcategory.update({
            where: { id: update.id },
            data: { budgetCents: update.budgetCents },
          }),
    ),
  );

  revalidatePath("/organizer");
  revalidatePath("/organizer/budget");
  return { success: true };
}
