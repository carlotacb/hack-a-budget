"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export type MetadataFormState = {
  error?: string;
  success?: boolean;
};

const metadataSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("createCategory"),
    name: z.string().trim().min(2),
  }),
  z.object({
    operation: z.literal("updateCategory"),
    id: z.string().cuid(),
    name: z.string().trim().min(2),
    active: z.string().optional(),
  }),
  z.object({
    operation: z.literal("createSubcategory"),
    categoryId: z.string().cuid(),
    name: z.string().trim().min(2),
  }),
  z.object({
    operation: z.literal("updateSubcategory"),
    id: z.string().cuid(),
    name: z.string().trim().min(2),
    active: z.string().optional(),
  }),
  z.object({
    operation: z.literal("createDepartment"),
    code: z.string().trim().min(2).regex(/^[a-z0-9-]+$/i),
    name: z.string().trim().min(2),
  }),
  z.object({
    operation: z.literal("updateDepartment"),
    id: z.string().cuid(),
    code: z.string().trim().min(2).regex(/^[a-z0-9-]+$/i),
    name: z.string().trim().min(2),
    active: z.string().optional(),
  }),
]);

export async function saveMetadata(
  _state: MetadataFormState,
  formData: FormData,
): Promise<MetadataFormState> {
  if (!(await getOrganizerId(["ADMIN"]))) {
    return { error: "Only admins can edit metadata." };
  }

  const parsed = metadataSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Complete all fields with valid values." };
  }

  const data = parsed.data;

  try {
    switch (data.operation) {
      case "createCategory":
        await prisma.category.create({ data: { name: data.name } });
        break;
      case "updateCategory":
        await prisma.category.update({
          where: { id: data.id },
          data: { name: data.name, active: data.active === "on" },
        });
        break;
      case "createSubcategory":
        await prisma.subcategory.create({
          data: { categoryId: data.categoryId, name: data.name },
        });
        break;
      case "updateSubcategory":
        await prisma.subcategory.update({
          where: { id: data.id },
          data: { name: data.name, active: data.active === "on" },
        });
        break;
      case "createDepartment":
        await prisma.department.create({
          data: { code: data.code.toLowerCase(), name: data.name },
        });
        break;
      case "updateDepartment":
        await prisma.department.update({
          where: { id: data.id },
          data: {
            code: data.code.toLowerCase(),
            name: data.name,
            active: data.active === "on",
          },
        });
        break;
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "That name or code is already in use." };
    }
    throw error;
  }

  revalidatePath("/organizer/settings/metadata");
  revalidatePath("/organizer/budget");
  revalidatePath("/organizer/expenses/new");
  return { success: true };
}
