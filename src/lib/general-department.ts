import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const GENERAL_DEPARTMENT_CODE = "general";

type DepartmentClient = Pick<
  Prisma.TransactionClient | typeof prisma,
  "department"
>;

/** The General department always exists per hackathon, so categories with
 * no department picked yet (like the auto-created "Unexpected expenses"
 * category) always have somewhere to attribute their expenses. Accepts an
 * optional transaction client so it can run inside a `$transaction`. */
export async function ensureGeneralDepartment(
  hackathonId: string,
  client: DepartmentClient = prisma,
) {
  return client.department.upsert({
    where: {
      hackathonId_code: { hackathonId, code: GENERAL_DEPARTMENT_CODE },
    },
    update: {},
    create: { hackathonId, code: GENERAL_DEPARTMENT_CODE, name: "General" },
  });
}
