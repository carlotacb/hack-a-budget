"use server";

import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerId } from "@/lib/organizer";
import { getPermittedOrganizer } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type ExpenseFormState = {
  error?: string;
  success?: boolean;
};

const expenseSchema = z.object({
  description: z.string().trim().min(2, "Add a short description."),
  categoryId: z.string().cuid("Select a valid category."),
  subcategoryId: z.string().optional(),
  budgetId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  incurredAt: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Use the date format DD/MM/YYYY."),
  vendor: z.string().trim().min(2, "Vendor must be at least 2 characters."),
});

function parseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

const ticketExtensions: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

async function saveTicket(ticket: File) {
  if (ticket.size === 0) {
    return null;
  }

  const extension = ticketExtensions[ticket.type];

  if (!extension) {
    throw new Error("Ticket must be a PDF, JPG, PNG, or WebP file.");
  }
  if (ticket.size > 5 * 1024 * 1024) {
    throw new Error("Ticket must be smaller than 5 MB.");
  }

  const blob = await put(`tickets/${randomUUID()}${extension}`, ticket, {
    access: "private",
  });

  return blob.url;
}

/** Validates the category/subcategory pair and returns the department the
 * expense should be attributed to: the category's own department (which
 * all of its subcategories inherit). The department is never taken from
 * client input. */
async function resolveCategoryAndDepartment(
  hackathonId: string,
  categoryId: string,
  subcategoryId: string | undefined,
  // When the organizer's "add expenses" permission is scoped to their own
  // department, only categories belonging to that department may be used
  // — never trust the client to enforce this.
  scopedDepartmentId?: string | null,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      hackathonId,
      active: true,
      ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}),
    },
    include: {
      subcategories: {
        where: subcategoryId
          ? { id: subcategoryId, active: true }
          : { id: "__none__" },
      },
    },
  });

  if (!category) {
    return { error: "The selected category is no longer available." } as const;
  }

  if (subcategoryId) {
    const subcategory = category.subcategories[0];
    if (!subcategory || subcategory.id !== subcategoryId) {
      return {
        error: "The selected subcategory does not belong to this category.",
      } as const;
    }
    return {
      category,
      subcategory,
      departmentId: category.departmentId,
    } as const;
  }

  return {
    category,
    subcategory: null,
    departmentId: category.departmentId,
  } as const;
}

/** Resolves which budget an expense should be attributed to: the
 * client-picked budget if it's valid for this hackathon, falling back to
 * whichever budget is currently active. Never trusts a budget ID that
 * doesn't belong to the hackathon. */
async function resolveBudgetId(
  hackathonId: string,
  requestedBudgetId: string | undefined,
  fallbackBudgetId: string | null,
) {
  if (requestedBudgetId) {
    const budget = await prisma.budget.findFirst({
      where: { id: requestedBudgetId, hackathonId },
      select: { id: true },
    });
    if (!budget) {
      return { error: "The selected budget is no longer available." } as const;
    }
    return { budgetId: budget.id } as const;
  }

  return { budgetId: fallbackBudgetId } as const;
}

export async function addExpense(
  _state: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const organizer = await getPermittedOrganizer("addExpenses");

  if (!organizer) {
    return { error: "You are not authorized to add expenses." };
  }
  const { userId: organizerId, hackathonId, departmentId: scopedDepartmentId } =
    organizer;

  const activeBudget = await prisma.budget.findFirst({
    where: { hackathonId, isActive: true },
    select: { id: true },
  });

  if (!activeBudget) {
    return { error: "Activate a budget before adding expenses." };
  }

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const incurredAt = parseDate(parsed.data.incurredAt);

  if (!incurredAt) {
    return { error: "Enter a valid date in DD/MM/YYYY format." };
  }

  const resolved = await resolveCategoryAndDepartment(
    hackathonId,
    parsed.data.categoryId,
    parsed.data.subcategoryId,
    scopedDepartmentId,
  );

  if ("error" in resolved) {
    return { error: resolved.error };
  }

  const resolvedBudget = await resolveBudgetId(
    hackathonId,
    parsed.data.budgetId,
    activeBudget.id,
  );

  if ("error" in resolvedBudget) {
    return { error: resolvedBudget.error };
  }

  const ticket = formData.get("ticket");
  let ticketPath: string | null = null;

  try {
    if (ticket instanceof File) {
      ticketPath = await saveTicket(ticket);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ticket upload failed.",
    };
  }

  try {
    await prisma.expense.create({
      data: {
        description: parsed.data.description,
        categoryLabel: resolved.category.name,
        categoryId: resolved.category.id,
        subcategoryId: resolved.subcategory?.id ?? null,
        departmentId: resolved.departmentId,
        budgetId: resolvedBudget.budgetId,
        amountCents: Math.round(parsed.data.amount * 100),
        incurredAt,
        vendor: parsed.data.vendor,
        ticketPath,
        organizerId,
        hackathonId,
      },
    });
  } catch (error) {
    if (ticketPath) {
      await del(ticketPath).catch((cleanupError) => {
        console.error("Failed to remove orphaned ticket", cleanupError);
      });
    }
    throw error;
  }

  revalidatePath("/organizer");
  revalidatePath("/organizer/expenses");
  return { success: true };
}

export async function updateExpense(
  _state: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const organizer = await getOrganizerId(["ADMIN"]);

  if (!organizer) {
    return { error: "You are not authorized to edit expenses." };
  }
  const { hackathonId } = organizer;

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "That expense no longer exists." };
  }

  const existing = await prisma.expense.findFirst({
    where: { id, hackathonId },
  });
  if (!existing) {
    return { error: "That expense no longer exists." };
  }

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const incurredAt = parseDate(parsed.data.incurredAt);

  if (!incurredAt) {
    return { error: "Enter a valid date in DD/MM/YYYY format." };
  }

  const resolved = await resolveCategoryAndDepartment(
    hackathonId,
    parsed.data.categoryId,
    parsed.data.subcategoryId,
  );

  if ("error" in resolved) {
    return { error: resolved.error };
  }

  const resolvedBudget = await resolveBudgetId(
    hackathonId,
    parsed.data.budgetId,
    existing.budgetId,
  );

  if ("error" in resolvedBudget) {
    return { error: resolvedBudget.error };
  }

  const ticket = formData.get("ticket");
  let ticketPath = existing.ticketPath;
  let previousTicketPath: string | null = null;

  try {
    if (ticket instanceof File && ticket.size > 0) {
      previousTicketPath = existing.ticketPath;
      ticketPath = await saveTicket(ticket);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ticket upload failed.",
    };
  }

  try {
    await prisma.expense.update({
      where: { id },
      data: {
        description: parsed.data.description,
        categoryLabel: resolved.category.name,
        categoryId: resolved.category.id,
        subcategoryId: resolved.subcategory?.id ?? null,
        departmentId: resolved.departmentId,
        budgetId: resolvedBudget.budgetId,
        amountCents: Math.round(parsed.data.amount * 100),
        incurredAt,
        vendor: parsed.data.vendor,
        ticketPath,
      },
    });
  } catch (error) {
    if (previousTicketPath !== null && ticketPath) {
      await del(ticketPath).catch((cleanupError) => {
        console.error("Failed to remove orphaned ticket", cleanupError);
      });
    }
    throw error;
  }

  if (previousTicketPath) {
    await del(previousTicketPath).catch((cleanupError) => {
      console.error("Failed to remove replaced ticket", cleanupError);
    });
  }

  revalidatePath("/organizer");
  revalidatePath("/organizer/expenses");
  return { success: true };
}

export async function deleteExpense(
  _state: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const organizer = await getOrganizerId(["ADMIN"]);

  if (!organizer) {
    return { error: "You are not authorized to delete expenses." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "That expense no longer exists." };
  }

  const existing = await prisma.expense.findFirst({
    where: { id, hackathonId: organizer.hackathonId },
  });
  if (!existing) {
    return { error: "That expense no longer exists." };
  }

  await prisma.expense.delete({ where: { id } });

  if (existing.ticketPath) {
    await del(existing.ticketPath).catch((cleanupError) => {
      console.error("Failed to remove deleted expense's ticket", cleanupError);
    });
  }

  revalidatePath("/organizer");
  revalidatePath("/organizer/expenses");
  return { success: true };
}
