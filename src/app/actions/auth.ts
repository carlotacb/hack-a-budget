"use server";

import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const registerSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Complete name must be at least 2 characters."),
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"]),
  city: z.string().trim().min(2, "City must be at least 2 characters."),
  major: z.string().trim().min(2, "Major must be at least 2 characters."),
});

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email or password is incorrect." };
    }
    throw error;
  }
}

export async function register(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        role: Role.HACKER,
        gender: parsed.data.gender,
        city: parsed.data.city,
        major: parsed.data.major,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "An account with this email already exists." };
    }
    throw error;
  }

  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });

  return {};
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}
