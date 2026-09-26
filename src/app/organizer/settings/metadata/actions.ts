"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  departmentCodeBase,
  generateDepartmentCode,
} from "@/lib/department-code";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { parseLocalDateTime } from "@/lib/travel";

export type MetadataFormState = {
  error?: string;
  success?: boolean;
};

const GENERAL_DEPARTMENT_CODE = "general";

const metadataSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("createCategory"),
    name: z.string().trim().min(2),
  }),
  z.object({
    operation: z.literal("createSubcategory"),
    categoryId: z.string().cuid(),
    name: z.string().trim().min(2),
    departmentId: z.string().cuid(),
  }),
  z.object({
    operation: z.literal("createDepartment"),
    name: z.string().trim().min(2),
  }),
  z.object({
    operation: z.literal("updateTravelSettings"),
    hackathonStartAt: z.string(),
    reimbursementInstructions: z.string().trim().min(1).max(5000),
    finalReviewInstructions: z.string().trim().min(1).max(5000),
  }),
  z.object({
    operation: z.literal("createTravelRequirement"),
    name: z.string().trim().min(2).max(200),
  }),
  z.object({
    operation: z.literal("updateTravelRequirement"),
    id: z.string().cuid(),
    name: z.string().trim().min(2).max(200),
    active: z.string().optional(),
  }),
  z.object({
    operation: z.literal("createTravelMessageTemplate"),
    name: z.string().trim().min(2).max(100),
    message: z.string().trim().min(1).max(2000),
  }),
  z.object({
    operation: z.literal("updateTravelMessageTemplate"),
    id: z.string().cuid(),
    name: z.string().trim().min(2).max(100),
    message: z.string().trim().min(1).max(2000),
    active: z.string().optional(),
  }),
]);

/**
 * Bulk-save forms encode each editable row as `prefix:<id>:<field>` keys so a
 * dynamic, variable-length list of rows can be submitted through one plain
 * <form> without client-side JS. This groups those keys back into rows.
 */
function collectRows(formData: FormData, prefix: string) {
  const rows = new Map<string, Record<string, string>>();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(`${prefix}:`) || typeof value !== "string") continue;

    const rest = key.slice(prefix.length + 1);
    const separatorIndex = rest.indexOf(":");
    if (separatorIndex === -1) continue;

    const id = rest.slice(0, separatorIndex);
    const field = rest.slice(separatorIndex + 1);

    if (!rows.has(id)) rows.set(id, {});
    rows.get(id)![field] = value;
  }

  return rows;
}

export async function saveMetadata(
  _state: MetadataFormState,
  formData: FormData,
): Promise<MetadataFormState> {
  if (!(await getOrganizerId(["ADMIN"]))) {
    return { error: "Only admins can edit metadata." };
  }

  const operation = formData.get("operation");

  if (operation === "bulkUpdateCategories") {
    return bulkUpdateCategories(formData);
  }

  if (operation === "bulkUpdateDepartments") {
    return bulkUpdateDepartments(formData);
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
      case "createSubcategory":
        await prisma.subcategory.create({
          data: {
            categoryId: data.categoryId,
            name: data.name,
            departmentId: data.departmentId,
          },
        });
        break;
      case "createDepartment": {
        const base = departmentCodeBase(data.name);
        const existing = await prisma.department.findMany({
          where: { code: { startsWith: base } },
          select: { code: true },
        });

        await prisma.department.create({
          data: {
            code: generateDepartmentCode(
              data.name,
              existing.map((department) => department.code),
            ),
            name: data.name,
          },
        });
        break;
      }
      case "updateTravelSettings": {
        const hackathonStartAt = data.hackathonStartAt
          ? parseLocalDateTime(data.hackathonStartAt)
          : null;

        if (data.hackathonStartAt && !hackathonStartAt) {
          return { error: "Enter a valid hackathon start date and time." };
        }

        await prisma.travelEventSettings.upsert({
          where: { id: "event" },
          update: {
            hackathonStartAt,
            reimbursementInstructions: data.reimbursementInstructions,
            finalReviewInstructions: data.finalReviewInstructions,
          },
          create: {
            id: "event",
            hackathonStartAt,
            reimbursementInstructions: data.reimbursementInstructions,
            finalReviewInstructions: data.finalReviewInstructions,
          },
        });
        break;
      }
      case "createTravelRequirement":
        await prisma.travelFinalRequirement.create({
          data: { name: data.name },
        });
        break;
      case "updateTravelRequirement":
        await prisma.travelFinalRequirement.update({
          where: { id: data.id },
          data: { name: data.name, active: data.active === "on" },
        });
        break;
      case "createTravelMessageTemplate":
        await prisma.travelMessageTemplate.create({
          data: { name: data.name, message: data.message },
        });
        break;
      case "updateTravelMessageTemplate":
        await prisma.travelMessageTemplate.update({
          where: { id: data.id },
          data: {
            name: data.name,
            message: data.message,
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

  revalidateMetadataPaths();
  return { success: true };
}

function revalidateMetadataPaths() {
  revalidatePath("/organizer/settings/metadata");
  revalidatePath("/organizer/budget");
  revalidatePath("/organizer/expenses");
  revalidatePath("/organizer/travel-reimbursements");
  revalidatePath("/hacker");
}

async function bulkUpdateCategories(
  formData: FormData,
): Promise<MetadataFormState> {
  const categoryRows = collectRows(formData, "category");
  const subcategoryRows = collectRows(formData, "subcategory");

  if (categoryRows.size === 0 && subcategoryRows.size === 0) {
    return { error: "Nothing to save." };
  }

  for (const row of categoryRows.values()) {
    if (!row.name || row.name.trim().length < 2) {
      return { error: "Each category needs a name with at least 2 characters." };
    }
  }

  for (const row of subcategoryRows.values()) {
    if (!row.name || row.name.trim().length < 2) {
      return {
        error: "Each subcategory needs a name with at least 2 characters.",
      };
    }
    if (!row.departmentId) {
      return { error: "Each subcategory must have a department." };
    }
  }

  try {
    await prisma.$transaction([
      ...Array.from(categoryRows.entries()).map(([id, row]) =>
        prisma.category.update({
          where: { id },
          data: { name: row.name.trim(), active: row.active === "on" },
        }),
      ),
      ...Array.from(subcategoryRows.entries()).map(([id, row]) =>
        prisma.subcategory.update({
          where: { id },
          data: {
            name: row.name.trim(),
            active: row.active === "on",
            departmentId: row.departmentId,
          },
        }),
      ),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "That name is already in use." };
    }
    throw error;
  }

  revalidateMetadataPaths();
  return { success: true };
}

async function bulkUpdateDepartments(
  formData: FormData,
): Promise<MetadataFormState> {
  const departmentRows = collectRows(formData, "department");

  if (departmentRows.size === 0) {
    return { error: "Nothing to save." };
  }

  const generalDepartment = await prisma.department.findUnique({
    where: { code: GENERAL_DEPARTMENT_CODE },
  });

  for (const row of departmentRows.values()) {
    if (!row.name || row.name.trim().length < 2) {
      return {
        error: "Each department needs a name with at least 2 characters.",
      };
    }
  }

  for (const [id, row] of departmentRows) {
    if (id === generalDepartment?.id) continue;

    if (
      !row.code ||
      row.code.trim().length < 2 ||
      !/^[a-z0-9-]+$/i.test(row.code.trim())
    ) {
      return { error: "Each department needs a valid code." };
    }
  }

  try {
    await prisma.$transaction(
      Array.from(departmentRows.entries()).map(([id, row]) => {
        const isGeneral = id === generalDepartment?.id;

        return prisma.department.update({
          where: { id },
          data: {
            name: row.name.trim(),
            ...(isGeneral
              ? {}
              : {
                  code: row.code!.trim().toLowerCase(),
                  active: row.active === "on",
                }),
          },
        });
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "That code is already in use." };
    }
    throw error;
  }

  revalidateMetadataPaths();
  return { success: true };
}
