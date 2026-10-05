"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { getRoleSettings } from "@/lib/role-settings";

export type UserRoleFormState = {
  error?: string;
  success?: boolean;
};

export type DeleteUserFormState = {
  error?: string;
  success?: boolean;
};

const userRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum([
    "HACKER",
    "ORGANIZER",
    "ORGANIZER_LEAD",
    "DIRECTOR",
    "ADMIN",
  ]),
  departmentId: z.string().cuid().optional(),
});

export async function updateUserRole(
  _state: UserRoleFormState,
  formData: FormData,
): Promise<UserRoleFormState> {
  const currentUser = await requireOrganizer(["ADMIN"]);

  const raw = Object.fromEntries(formData);
  const parsed = userRoleSchema.safeParse({
    ...raw,
    departmentId: raw.departmentId || undefined,
  });

  if (!parsed.success) {
    return { error: "The selected user is invalid." };
  }

  if (parsed.data.userId === currentUser.id) {
    return { error: "You cannot change your own role." };
  }

  const roleSettings = getRoleSettings(currentUser.hackathonSettings);
  const targetRole = roleSettings[parsed.data.role];

  if (!targetRole.enabled) {
    return { error: "This role is disabled for this hackathon." };
  }

  if (targetRole.requiresDepartment && !parsed.data.departmentId) {
    return { error: "Select a department for this role." };
  }

  const departmentId = targetRole.requiresDepartment
    ? parsed.data.departmentId
    : null;

  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, hackathonId: currentUser.hackathonId },
      select: { id: true },
    });
    if (!department) {
      return { error: "The selected department is invalid." };
    }
  }

  const result = await prisma.hackathonMembership.updateMany({
    where: {
      userId: parsed.data.userId,
      hackathonId: currentUser.hackathonId,
    },
    data: { role: parsed.data.role, departmentId },
  });

  if (result.count === 0) {
    return { error: "This user no longer exists." };
  }

  revalidatePath("/organizer/users");
  return { success: true };
}

const deleteUserSchema = z.object({
  userId: z.string().cuid(),
});

/**
 * Removes a user's access to the current hackathon only — users can belong
 * to several hackathons, so deleting them here just drops their membership
 * (and any invites they created) for this tenant. If that was their last
 * membership anywhere, the whole account (and its now-orphaned data, e.g.
 * expenses/travel reimbursements) is removed via Prisma's cascade.
 */
export async function deleteOrganizerUser(
  _state: DeleteUserFormState,
  formData: FormData,
): Promise<DeleteUserFormState> {
  const currentUser = await requireOrganizer(["ADMIN"]);

  const parsed = deleteUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "The selected user is invalid." };
  }

  if (parsed.data.userId === currentUser.id) {
    return { error: "You cannot delete your own account." };
  }

  await prisma.$transaction(async (tx) => {
    const membership = await tx.hackathonMembership.findUnique({
      where: {
        userId_hackathonId: {
          userId: parsed.data.userId,
          hackathonId: currentUser.hackathonId,
        },
      },
    });

    if (!membership) return;

    await tx.hackathonMembership.delete({ where: { id: membership.id } });

    const remainingMemberships = await tx.hackathonMembership.count({
      where: { userId: parsed.data.userId },
    });

    if (remainingMemberships === 0) {
      await tx.user.delete({ where: { id: parsed.data.userId } });
    }
  });

  revalidatePath("/organizer/users");
  return { success: true };
}
