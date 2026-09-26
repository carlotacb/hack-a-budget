import { prisma } from "@/lib/prisma";

export const GENERAL_DEPARTMENT_CODE = "general";

/** The General department always exists, so categories with no
 * subcategories of their own (like Unexpected expenses) always have
 * somewhere to attribute their expenses. */
export async function ensureGeneralDepartment() {
  return prisma.department.upsert({
    where: { code: GENERAL_DEPARTMENT_CODE },
    update: {},
    create: { code: GENERAL_DEPARTMENT_CODE, name: "General" },
  });
}
