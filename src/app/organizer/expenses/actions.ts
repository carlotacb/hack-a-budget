"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export type ExpenseFormState = {
  error?: string;
  success?: boolean;
};

const expenseSchema = z.object({
  description: z.string().trim().min(2, "Add a short description."),
  categoryId: z.string().cuid("Select a valid category."),
  subcategoryId: z.string().optional(),
  departmentId: z.string().cuid("Select a valid department."),
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

  const directory = path.join(process.cwd(), "public", "uploads", "tickets");
  const filename = `${randomUUID()}${extension}`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await ticket.arrayBuffer()));

  return `/uploads/tickets/${filename}`;
}

export async function addExpense(
  _state: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const organizerId = await getOrganizerId(["ADMIN"]);

  if (!organizerId) {
    return { error: "You are not authorized to add expenses." };
  }

  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const incurredAt = parseDate(parsed.data.incurredAt);

  if (!incurredAt) {
    return { error: "Enter a valid date in DD/MM/YYYY format." };
  }

  const [category, department] = await Promise.all([
    prisma.category.findFirst({
      where: { id: parsed.data.categoryId, active: true },
      include: {
        subcategories: {
          where: parsed.data.subcategoryId
            ? { id: parsed.data.subcategoryId, active: true }
            : { id: "__none__" },
        },
      },
    }),
    prisma.department.findFirst({
      where: { id: parsed.data.departmentId, active: true },
    }),
  ]);

  if (!category) {
    return { error: "The selected category is no longer available." };
  }
  if (!department) {
    return { error: "The selected department is no longer available." };
  }
  if (
    parsed.data.subcategoryId &&
    category.subcategories[0]?.id !== parsed.data.subcategoryId
  ) {
    return { error: "The selected subcategory does not belong to this category." };
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
        categoryLabel: category.name,
        categoryId: category.id,
        subcategoryId: parsed.data.subcategoryId || null,
        departmentId: department.id,
        amountCents: Math.round(parsed.data.amount * 100),
        incurredAt,
        vendor: parsed.data.vendor,
        ticketPath,
        organizerId,
      },
    });
  } catch (error) {
    if (ticketPath) {
      await unlink(path.join(process.cwd(), "public", ticketPath)).catch(
        (cleanupError) => {
          console.error("Failed to remove orphaned ticket", cleanupError);
        },
      );
    }
    throw error;
  }

  revalidatePath("/organizer");
  revalidatePath("/organizer/expenses");
  return { success: true };
}
