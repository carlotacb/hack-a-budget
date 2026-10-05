"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  departmentCodeBase,
  generateDepartmentCode,
} from "@/lib/department-code";
import {
  isValidHexColor,
  nextDepartmentColor,
} from "@/lib/department-colors";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { parseLocalDateTime } from "@/lib/travel";
import { UNEXPECTED_CATEGORY_NAME } from "@/lib/budget-constants";
import {
  mergeRoleSettingsIntoHackathonSettings,
  parseRoleSettingsFromFormData,
} from "@/lib/role-settings";
import {
  syncNewCategoryToActiveBudget,
  syncNewSubcategoryToActiveBudget,
} from "@/app/organizer/budget/actions";

export type MetadataFormState = {
  error?: string;
  success?: boolean;
};

const GENERAL_DEPARTMENT_CODE = "general";

const metadataSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("createCategory"),
    name: z.string().trim().min(2),
    departmentId: z.string().cuid(),
  }),
  z.object({
    operation: z.literal("createSubcategory"),
    categoryId: z.string().cuid(),
    name: z.string().trim().min(2),
  }),
  z.object({
    operation: z.literal("createDepartment"),
    name: z.string().trim().min(2),
  }),
  z.object({
    operation: z.literal("deleteCategory"),
    id: z.string().cuid(),
  }),
  z.object({
    operation: z.literal("deleteSubcategory"),
    id: z.string().cuid(),
  }),
  z.object({
    operation: z.literal("deleteDepartment"),
    id: z.string().cuid(),
  }),
  z.object({
    operation: z.literal("updateTravelSettings"),
    hackathonStartAt: z.string(),
    reimbursementInstructions: z.string().trim().min(1).max(5000),
    finalReviewInstructions: z.string().trim().min(1).max(5000),
  }),
  z.object({
    operation: z.literal("updateHackathonSettings"),
    travelReimbursementEnabled: z.string().optional(),
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
  const organizer = await getOrganizerId(["ADMIN"]);
  if (!organizer) {
    return { error: "Only admins can edit metadata." };
  }
  const { hackathonId } = organizer;

  const operation = formData.get("operation");

  if (operation === "bulkUpdateCategories") {
    return bulkUpdateCategories(hackathonId, formData);
  }

  if (operation === "bulkUpdateDepartments") {
    return bulkUpdateDepartments(hackathonId, formData);
  }

  if (operation === "updateRoleSettings") {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { settings: true },
    });
    const roles = parseRoleSettingsFromFormData(formData);
    await prisma.hackathon.update({
      where: { id: hackathonId },
      data: {
        settings: mergeRoleSettingsIntoHackathonSettings(
          hackathon?.settings,
          roles,
        ) as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/organizer/settings");
    revalidatePath("/organizer/users");
    return { success: true };
  }

  const parsed = metadataSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Complete all fields with valid values." };
  }

  const data = parsed.data;

  const travelOperations = new Set([
    "updateTravelSettings",
    "createTravelRequirement",
    "updateTravelRequirement",
    "createTravelMessageTemplate",
    "updateTravelMessageTemplate",
  ]);

  if (travelOperations.has(data.operation)) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { travelReimbursementEnabled: true },
    });
    if (!hackathon?.travelReimbursementEnabled) {
      return {
        error:
          "Enable the travel reimbursement flow in Features before editing travel settings.",
      };
    }
  }

  try {
    switch (data.operation) {
      case "createCategory": {
        const department = await prisma.department.findFirst({
          where: { id: data.departmentId, hackathonId },
          select: { id: true },
        });
        if (!department) {
          return { error: "That department no longer exists." };
        }

        const category = await prisma.category.create({
          data: { hackathonId, name: data.name, departmentId: data.departmentId },
        });
        await syncNewCategoryToActiveBudget(
          hackathonId,
          category.id,
          category.name,
        );
        break;
      }
      case "createSubcategory": {
        const parentCategory = await prisma.category.findFirst({
          where: { id: data.categoryId, hackathonId },
          select: { name: true },
        });
        if (!parentCategory) {
          return { error: "That category no longer exists." };
        }
        if (parentCategory.name === UNEXPECTED_CATEGORY_NAME) {
          return {
            error: "Unexpected expenses can't have subcategories.",
          };
        }

        const subcategory = await prisma.subcategory.create({
          data: {
            categoryId: data.categoryId,
            name: data.name,
          },
        });
        await syncNewSubcategoryToActiveBudget(
          hackathonId,
          subcategory.id,
          data.categoryId,
          subcategory.name,
        );
        break;
      }
      case "createDepartment": {
        const base = departmentCodeBase(data.name);
        const existing = await prisma.department.findMany({
          where: { hackathonId, code: { startsWith: base } },
          select: { code: true },
        });
        const departmentCount = await prisma.department.count({
          where: { hackathonId },
        });

        await prisma.department.create({
          data: {
            hackathonId,
            code: generateDepartmentCode(
              data.name,
              existing.map((department) => department.code),
            ),
            name: data.name,
            color: nextDepartmentColor(departmentCount),
          },
        });
        break;
      }
      // Deleting a category also deletes its subcategories (cascade);
      // expenses keep their category label and just lose the link.
      case "deleteCategory": {
        const category = await prisma.category.findFirst({
          where: { id: data.id, hackathonId },
          select: { name: true },
        });

        if (!category) {
          return { error: "That category no longer exists." };
        }
        if (category.name === UNEXPECTED_CATEGORY_NAME) {
          return { error: "The Unexpected expenses category can't be deleted." };
        }

        const expenseCount = await prisma.expense.count({
          where: {
            OR: [
              { categoryId: data.id },
              { subcategory: { categoryId: data.id } },
            ],
          },
        });

        if (expenseCount > 0) {
          return {
            error: `This category has ${expenseCount} expense${expenseCount === 1 ? "" : "s"} and can't be deleted. Mark it inactive instead.`,
          };
        }

        await prisma.category.delete({ where: { id: data.id } });
        break;
      }
      case "deleteSubcategory": {
        const subcategory = await prisma.subcategory.findFirst({
          where: { id: data.id, category: { hackathonId } },
          select: { id: true },
        });
        if (!subcategory) {
          return { error: "That subcategory no longer exists." };
        }

        const expenseCount = await prisma.expense.count({
          where: { subcategoryId: data.id },
        });

        if (expenseCount > 0) {
          return {
            error: `This subcategory has ${expenseCount} expense${expenseCount === 1 ? "" : "s"} and can't be deleted. Mark it inactive instead.`,
          };
        }

        await prisma.subcategory.delete({ where: { id: data.id } });
        break;
      }
      case "deleteDepartment": {
        const department = await prisma.department.findFirst({
          where: { id: data.id, hackathonId },
          select: { code: true },
        });

        if (!department) {
          return { error: "That department no longer exists." };
        }
        if (department.code === GENERAL_DEPARTMENT_CODE) {
          return { error: "The General department can't be deleted." };
        }

        const categoryCount = await prisma.category.count({
          where: { departmentId: data.id },
        });

        if (categoryCount > 0) {
          return {
            error: `This department still has ${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}. Move them to another department first.`,
          };
        }

        await prisma.department.delete({ where: { id: data.id } });
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
          where: { hackathonId },
          update: {
            hackathonStartAt,
            reimbursementInstructions: data.reimbursementInstructions,
            finalReviewInstructions: data.finalReviewInstructions,
          },
          create: {
            hackathonId,
            hackathonStartAt,
            reimbursementInstructions: data.reimbursementInstructions,
            finalReviewInstructions: data.finalReviewInstructions,
          },
        });
        break;
      }
      case "updateHackathonSettings": {
        await prisma.hackathon.update({
          where: { id: hackathonId },
          data: {
            travelReimbursementEnabled: Boolean(
              data.travelReimbursementEnabled,
            ),
          },
        });
        break;
      }
      case "createTravelRequirement":
        await prisma.travelFinalRequirement.create({
          data: { hackathonId, name: data.name },
        });
        break;
      case "updateTravelRequirement":
        await prisma.travelFinalRequirement.updateMany({
          where: { id: data.id, hackathonId },
          data: { name: data.name, active: data.active === "on" },
        });
        break;
      case "createTravelMessageTemplate":
        await prisma.travelMessageTemplate.create({
          data: { hackathonId, name: data.name, message: data.message },
        });
        break;
      case "updateTravelMessageTemplate":
        await prisma.travelMessageTemplate.updateMany({
          where: { id: data.id, hackathonId },
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { error: "That item is still in use." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { error: "That item no longer exists." };
    }
    throw error;
  }

  revalidateMetadataPaths();
  return { success: true };
}

function revalidateMetadataPaths() {
  revalidatePath("/organizer/settings");
  revalidatePath("/organizer/budget");
  revalidatePath("/organizer/expenses");
  revalidatePath("/organizer/travel-reimbursements");
  revalidatePath("/hacker");
}

async function bulkUpdateCategories(
  hackathonId: string,
  formData: FormData,
): Promise<MetadataFormState> {
  const categoryRows = collectRows(formData, "category");
  const subcategoryRows = collectRows(formData, "subcategory");

  const unexpectedCategory = await prisma.category.findFirst({
    where: { hackathonId, name: UNEXPECTED_CATEGORY_NAME },
    select: { id: true },
  });
  // Defense in depth: the UI never renders inputs for it, but never let a
  // crafted payload edit/deactivate the Unexpected expenses category.
  if (unexpectedCategory) {
    categoryRows.delete(unexpectedCategory.id);
  }

  if (categoryRows.size === 0 && subcategoryRows.size === 0) {
    return { error: "Nothing to save." };
  }

  for (const row of categoryRows.values()) {
    if (!row.name || row.name.trim().length < 2) {
      return { error: "Each category needs a name with at least 2 characters." };
    }
    if (!row.departmentId) {
      return { error: "Each category must have a department." };
    }
  }

  for (const row of subcategoryRows.values()) {
    if (!row.name || row.name.trim().length < 2) {
      return {
        error: "Each subcategory needs a name with at least 2 characters.",
      };
    }
  }

  const activeBudget = await prisma.budget.findFirst({
    where: { hackathonId, isActive: true },
    select: { id: true },
  });

  try {
    await prisma.$transaction([
      ...Array.from(categoryRows.entries()).map(([id, row]) =>
        prisma.category.updateMany({
          where: { id, hackathonId },
          data: {
            name: row.name.trim(),
            active: row.active === "on",
            departmentId: row.departmentId,
          },
        }),
      ),
      ...Array.from(subcategoryRows.entries()).map(([id, row]) =>
        prisma.subcategory.updateMany({
          where: { id, category: { hackathonId } },
          data: {
            name: row.name.trim(),
            active: row.active === "on",
          },
        }),
      ),
      // Keep the active budget's category/subcategory name snapshots in
      // sync with renames — otherwise the budget plan keeps showing the
      // old name until a brand-new budget is created from scratch.
      ...(activeBudget
        ? [
            ...Array.from(categoryRows.entries()).map(([id, row]) =>
              prisma.budgetCategory.updateMany({
                where: { budgetId: activeBudget.id, categoryId: id },
                data: { name: row.name.trim() },
              }),
            ),
            ...Array.from(subcategoryRows.entries()).map(([id, row]) =>
              prisma.budgetSubcategory.updateMany({
                where: {
                  subcategoryId: id,
                  budgetCategory: { budgetId: activeBudget.id },
                },
                data: { name: row.name.trim() },
              }),
            ),
          ]
        : []),
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
  hackathonId: string,
  formData: FormData,
): Promise<MetadataFormState> {
  const departmentRows = collectRows(formData, "department");

  if (departmentRows.size === 0) {
    return { error: "Nothing to save." };
  }

  const generalDepartment = await prisma.department.findFirst({
    where: { hackathonId, code: GENERAL_DEPARTMENT_CODE },
  });

  for (const row of departmentRows.values()) {
    if (!row.name || row.name.trim().length < 2) {
      return {
        error: "Each department needs a name with at least 2 characters.",
      };
    }
    if (row.color && !isValidHexColor(row.color)) {
      return { error: "Department colors must be valid hex colors." };
    }
  }

  await prisma.$transaction(
    Array.from(departmentRows.entries()).map(([id, row]) => {
      const isGeneral = id === generalDepartment?.id;

      return prisma.department.updateMany({
        where: { id, hackathonId },
        data: {
          name: row.name.trim(),
          ...(row.color ? { color: row.color } : {}),
          ...(isGeneral ? {} : { active: row.active === "on" }),
        },
      });
    }),
  );

  revalidateMetadataPaths();
  return { success: true };
}
