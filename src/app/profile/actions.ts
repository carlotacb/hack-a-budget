"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ProfileFormState = {
  error?: string;
  success?: boolean;
};

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Complete name must be at least 2 characters."),
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"]),
  city: z.string().trim().min(2, "City must be at least 2 characters."),
  major: z.string().trim().min(2, "Major must be at least 2 characters."),
});

export async function updateProfile(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Sign in to update your profile." };
  }

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await prisma.user.updateMany({
    where: { id: session.user.id },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { error: "Your account could not be found." };
  }

  revalidatePath("/profile");
  revalidatePath("/hacker");
  revalidatePath("/organizer");
  return { success: true };
}
