"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type UserRoleFormState = {
  error?: string;
  success?: boolean;
};

const userRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["HACKER", "ORGANIZER", "DIRECTOR", "ADMIN"]),
});

export async function updateUserRole(
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

  if (currentUser?.role !== "ADMIN") {
    return { error: "Only admins can change user roles." };
  }

  const parsed = userRoleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "The selected user is invalid." };
  }

  if (parsed.data.userId === session.user.id) {
    return { error: "You cannot change your own role." };
  }

  const result = await prisma.user.updateMany({
    where: {
      id: parsed.data.userId,
      role: { not: parsed.data.role },
    },
    data: { role: parsed.data.role },
  });

  if (result.count === 0) {
    return { error: "This user already has that role or no longer exists." };
  }

  revalidatePath("/organizer/users");
  return { success: true };
}
