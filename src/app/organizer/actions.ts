"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ExpenseFormState = {
  error?: string;
  success?: boolean;
};

export type UserRoleFormState = {
  error?: string;
  success?: boolean;
};

const expenseSchema = z.object({
  description: z.string().trim().min(2, "Add a short description."),
  category: z.enum(["Venue", "Catering", "Prizes", "Marketing", "Other"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  incurredAt: z.coerce.date(),
});

export async function addExpense(
  _state: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const session = await auth();

  if (!session?.user || session.user.role !== "ORGANIZER") {
    return { error: "You are not authorized to add expenses." };
  }

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.expense.create({
    data: {
      description: parsed.data.description,
      category: parsed.data.category,
      amountCents: Math.round(parsed.data.amount * 100),
      incurredAt: parsed.data.incurredAt,
      organizerId: session.user.id,
    },
  });

  revalidatePath("/organizer");
  return { success: true };
}

const userRoleSchema = z.object({
  userId: z.string().cuid(),
});

export async function promoteToOrganizer(
  _state: UserRoleFormState,
  formData: FormData,
): Promise<UserRoleFormState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Sign in to manage users." };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== "ORGANIZER") {
    return { error: "Only organizers can change user roles." };
  }

  const parsed = userRoleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "The selected user is invalid." };
  }

  const result = await prisma.user.updateMany({
    where: {
      id: parsed.data.userId,
      role: "HACKER",
    },
    data: { role: "ORGANIZER" },
  });

  if (result.count === 0) {
    return { error: "This user is already an organizer or no longer exists." };
  }

  revalidatePath("/organizer/users");
  return { success: true };
}
