"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { hash, compare } from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setActiveHackathon } from "@/lib/current-hackathon";
import { generateDepartmentCode } from "@/lib/department-code";
import { parseRoleSettingsFromFormData } from "@/lib/role-settings";

export type AuthFormState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/** Profile fields used by the hackathon-registration and hacker-invite
 * forms. Password is optional here (unlike loginSchema): when the "Check
 * email" button finds an existing account, the form locks every field —
 * including password — and submits `verifiedEmail` instead, so there's
 * nothing to type. A brand new account still has to pick a password; that
 * requirement is enforced in the action itself once we know which branch
 * we're in. */
const hackerProfileSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, "Complete name must be at least 2 characters."),
  gender: z.enum(["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY"]),
  diet: z.enum([
    "OMNIVORE",
    "VEGETARIAN",
    "VEGAN",
    "GLUTEN_FREE",
    "HALAL",
    "KOSHER",
    "OTHER",
  ]),
  tshirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  // Set by the client only after "Check email" confirms this exact email
  // already has an account — lets the action skip the password check
  // since every field was locked (read-only) instead of asking them to
  // retype anything.
  verifiedEmail: z.string().optional(),
});

const hackathonFieldsSchema = z.object({
  hackathonName: z
    .string()
    .trim()
    .min(2, "Hackathon name must be at least 2 characters."),
  travelReimbursementEnabled: z.string().optional(),
  departments: z.string().optional(),
  categories: z.string().optional(),
});

const hackathonRegisterSchema = hackerProfileSchema.merge(
  hackathonFieldsSchema,
);

/** Reads the tag-list ("add button") department/category inputs from the
 * registration form: repeated `<input type="hidden" name="departments">`
 * tags, one per entry, which `Object.fromEntries` would otherwise collapse
 * down to just the last one. */
function parseNameListFromFormData(formData: FormData, field: string) {
  const names = formData
    .getAll(field)
    .map((value) => String(value).trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

/** Seeds a brand new hackathon's isolated space: the General department
 * (so unattributed expenses always have somewhere to go) plus any
 * departments/categories the admin listed. */
async function seedHackathonMetadata(
  tx: Prisma.TransactionClient,
  hackathonId: string,
  departmentNames: string[],
  categoryNames: string[],
) {
  const generalDepartment = await tx.department.create({
    data: { hackathonId, code: "general", name: "General" },
  });

  const existingCodes = new Set(["general"]);
  for (const name of departmentNames) {
    const code = generateDepartmentCode(name, existingCodes);
    existingCodes.add(code);
    await tx.department.create({ data: { hackathonId, code, name } });
  }

  for (const name of categoryNames) {
    await tx.category.create({
      data: { hackathonId, name, departmentId: generalDepartment.id },
    });
  }

  await tx.travelEventSettings.create({ data: { hackathonId } });
}

/** Looks up an email so a registration form can tell the visitor they
 * already have an account before they finish filling it in. Only returns
 * basic profile fields — never the password hash — so the form can
 * prefill and lock the rest of the form once an account is found. */
export async function checkExistingAccount(email: string): Promise<{
  exists: boolean;
  name?: string;
  gender?: string;
  diet?: string;
  tshirtSize?: string;
}> {
  const normalized = email.trim().toLowerCase();

  if (!normalized || !z.string().email().safeParse(normalized).success) {
    return { exists: false };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { name: true, gender: true, diet: true, tshirtSize: true },
  });

  if (!user) {
    return { exists: false };
  }

  return {
    exists: true,
    name: user.name ?? undefined,
    gender: user.gender ?? undefined,
    diet: user.diet ?? undefined,
    tshirtSize: user.tshirtSize ?? undefined,
  };
}

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

/** Registers a new hackathon as its own empty space: isolated departments,
 * categories, budget, expenses and travel flow. If the visitor is already
 * signed in, this just adds the new hackathon to their existing account
 * (as ADMIN) — a single account can belong to several hackathons. If not,
 * it also creates the account that becomes that hackathon's first ADMIN. */
export async function registerHackathon(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await auth();
  const raw = Object.fromEntries(formData);

  // A stale session cookie can outlive its user (e.g. after an admin
  // deletes the account, or a dev database reset) — fall back to the
  // signed-out registration path instead of crashing on the FK
  // constraint below.
  if (session?.user) {
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!existingUser) {
      await signOut({ redirect: false });
      // The client rendered the authenticated form (no profile fields)
      // before we discovered the session was stale — falling through
      // in-process would validate against fields the browser never sent.
      // Redirect to a fresh page load so the client re-renders as signed
      // out, with its full profile fields, before resubmitting.
      redirect("/register");
    }
  }

  if (session?.user) {
    const parsed = hackathonFieldsSchema.safeParse(raw);

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const departmentNames = parseNameListFromFormData(formData, "departments");
    const categoryNames = parseNameListFromFormData(formData, "categories");
    const roleSettings = parseRoleSettingsFromFormData(formData);

    const hackathonId = await prisma.$transaction(async (tx) => {
      const hackathon = await tx.hackathon.create({
        data: {
          name: parsed.data.hackathonName,
          travelReimbursementEnabled: Boolean(
            parsed.data.travelReimbursementEnabled,
          ),
          settings: { roles: roleSettings },
        },
      });

      await tx.hackathonMembership.create({
        data: {
          userId: session.user.id,
          hackathonId: hackathon.id,
          role: Role.ADMIN,
        },
      });

      await seedHackathonMetadata(
        tx,
        hackathon.id,
        departmentNames,
        categoryNames,
      );

      return hackathon.id;
    });

    await setActiveHackathon(hackathonId);
    redirect("/dashboard");
  }

  const parsed = hackathonRegisterSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  const departmentNames = parseNameListFromFormData(formData, "departments");
  const categoryNames = parseNameListFromFormData(formData, "categories");
  const roleSettings = parseRoleSettingsFromFormData(formData);

  // The email already has an account: don't create a second user record,
  // just add this new (empty) hackathon to that existing account as its
  // ADMIN — the same account can belong to several hackathons. We need
  // proof this is really their account: either the client already
  // confirmed it via "Check email" (verifiedEmail matches, every field was
  // locked so there was nothing else to prove identity with), or they
  // typed the real password.
  if (existingUser) {
    const verifiedByCheck =
      parsed.data.verifiedEmail?.trim().toLowerCase() === email;

    const verifiedByPassword =
      !verifiedByCheck &&
      !!parsed.data.password &&
      !!existingUser.passwordHash &&
      (await compare(parsed.data.password, existingUser.passwordHash));

    if (!verifiedByCheck && !verifiedByPassword) {
      return {
        error:
          'An account with this email already exists. Use "Check email" to confirm it, or enter its password to add this hackathon to it.',
      };
    }

    let hackathonId: string;

    try {
      hackathonId = await prisma.$transaction(async (tx) => {
        const hackathon = await tx.hackathon.create({
          data: {
            name: parsed.data.hackathonName,
            travelReimbursementEnabled: Boolean(
              parsed.data.travelReimbursementEnabled,
            ),
            settings: { roles: roleSettings },
          },
        });

        await tx.hackathonMembership.create({
          data: {
            userId: existingUser.id,
            hackathonId: hackathon.id,
            role: Role.ADMIN,
          },
        });

        await seedHackathonMetadata(
          tx,
          hackathon.id,
          departmentNames,
          categoryNames,
        );

        return hackathon.id;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return { error: "Something went wrong creating the hackathon. Please try again." };
      }
      throw error;
    }

    await setActiveHackathon(hackathonId);

    if (verifiedByPassword && parsed.data.password) {
      await signIn("credentials", {
        email,
        password: parsed.data.password,
        redirectTo: "/dashboard",
      });
      return {};
    }

    // Verified purely through "Check email" — no password was collected
    // (the field was locked), so there's nothing to sign in with. The
    // hackathon is already linked to their account. Redirect (rather than
    // return state) so the browser lands on a fresh page instead of
    // whatever page triggered the action — avoids getting stuck if this
    // one later becomes stale/invalid for other reasons.
    redirect("/login?linked=1");
  }

  const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .safeParse(parsed.data.password);

  if (!passwordSchema.success) {
    return { error: passwordSchema.error.issues[0].message };
  }

  const passwordHash = await hash(passwordSchema.data, 12);

  let hackathonId: string;

  try {
    hackathonId = await prisma.$transaction(async (tx) => {
      const hackathon = await tx.hackathon.create({
        data: {
          name: parsed.data.hackathonName,
          travelReimbursementEnabled: Boolean(
            parsed.data.travelReimbursementEnabled,
          ),
          settings: { roles: roleSettings },
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash,
          gender: parsed.data.gender,
          diet: parsed.data.diet,
          tshirtSize: parsed.data.tshirtSize,
        },
      });

      await tx.hackathonMembership.create({
        data: { userId: user.id, hackathonId: hackathon.id, role: Role.ADMIN },
      });

      await seedHackathonMetadata(
        tx,
        hackathon.id,
        departmentNames,
        categoryNames,
      );

      return hackathon.id;
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

  await setActiveHackathon(hackathonId);
  await signIn("credentials", {
    email,
    password: passwordSchema.data,
    redirectTo: "/dashboard",
  });

  return {};
}

/** Hacker self-registration through a single-use invite link generated by
 * an organizer in the Users tab. The token is scoped to one hackathon and
 * is consumed on success. If the visitor is already signed in, this just
 * adds the invite's hackathon to their existing account as HACKER. */
export async function registerWithInvite(
  token: string,
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const invite = await prisma.hackerInvite.findUnique({ where: { token } });

  if (!invite || invite.usedAt) {
    return { error: "This invite link is invalid or has already been used." };
  }

  const session = await auth();

  // A stale session cookie can outlive its user (e.g. after an admin
  // deletes the account, or a dev database reset) — fall back to the
  // signed-out registration path instead of crashing on the FK
  // constraint below.
  if (session?.user) {
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!existingUser) {
      await signOut({ redirect: false });
      // The client rendered the authenticated form (no profile fields)
      // before we discovered the session was stale — redirect to a fresh
      // page load so the client re-renders as signed out, with its full
      // profile fields, before resubmitting.
      redirect(`/invite/${token}`);
    }
  }

  if (session?.user) {
    try {
      await prisma.$transaction(async (tx) => {
        const freshInvite = await tx.hackerInvite.findUnique({
          where: { token },
        });
        if (!freshInvite || freshInvite.usedAt) {
          throw new Error("INVITE_USED");
        }

        await tx.hackathonMembership.upsert({
          where: {
            userId_hackathonId: {
              userId: session.user.id,
              hackathonId: freshInvite.hackathonId,
            },
          },
          update: {},
          create: {
            userId: session.user.id,
            hackathonId: freshInvite.hackathonId,
            role: Role.HACKER,
          },
        });

        await tx.hackerInvite.update({
          where: { token },
          data: { usedAt: new Date(), usedById: session.user.id },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INVITE_USED") {
        return {
          error: "This invite link is invalid or has already been used.",
        };
      }
      throw error;
    }

    await setActiveHackathon(invite.hackathonId);
    redirect("/dashboard");
  }

  const parsed = hackerProfileSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  // Same rule as hackathon registration: don't create a duplicate account,
  // just add this invite's hackathon to the existing one as HACKER, once
  // we're sure it's actually that account's owner — either "Check email"
  // already confirmed it (verifiedEmail matches, fields were locked), or
  // they typed the real password.
  if (existingUser) {
    const verifiedByCheck =
      parsed.data.verifiedEmail?.trim().toLowerCase() === email;

    const verifiedByPassword =
      !verifiedByCheck &&
      !!parsed.data.password &&
      !!existingUser.passwordHash &&
      (await compare(parsed.data.password, existingUser.passwordHash));

    if (!verifiedByCheck && !verifiedByPassword) {
      return {
        error:
          'An account with this email already exists. Use "Check email" to confirm it, or enter its password to accept this invite.',
      };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const freshInvite = await tx.hackerInvite.findUnique({
          where: { token },
        });
        if (!freshInvite || freshInvite.usedAt) {
          throw new Error("INVITE_USED");
        }

        await tx.hackathonMembership.upsert({
          where: {
            userId_hackathonId: {
              userId: existingUser.id,
              hackathonId: freshInvite.hackathonId,
            },
          },
          update: {},
          create: {
            userId: existingUser.id,
            hackathonId: freshInvite.hackathonId,
            role: Role.HACKER,
          },
        });

        await tx.hackerInvite.update({
          where: { token },
          data: { usedAt: new Date(), usedById: existingUser.id },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INVITE_USED") {
        return {
          error: "This invite link is invalid or has already been used.",
        };
      }
      throw error;
    }

    await setActiveHackathon(invite.hackathonId);

    if (verifiedByPassword && parsed.data.password) {
      await signIn("credentials", {
        email,
        password: parsed.data.password,
        redirectTo: "/dashboard",
      });
      return {};
    }

    // Verified purely through "Check email" — no password was collected,
    // so there's nothing to sign in with. The invite is accepted and the
    // hackathon is linked to their account. Redirect instead of returning
    // state: this invite's own page re-renders after the action runs and,
    // now that the invite is used, would otherwise show "invalid link".
    redirect("/login?linked=1");
  }

  const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .safeParse(parsed.data.password);

  if (!passwordSchema.success) {
    return { error: passwordSchema.error.issues[0].message };
  }

  const passwordHash = await hash(passwordSchema.data, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const freshInvite = await tx.hackerInvite.findUnique({
        where: { token },
      });
      if (!freshInvite || freshInvite.usedAt) {
        throw new Error("INVITE_USED");
      }

      const user = await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash,
          gender: parsed.data.gender,
          diet: parsed.data.diet,
          tshirtSize: parsed.data.tshirtSize,
        },
      });

      await tx.hackathonMembership.create({
        data: {
          userId: user.id,
          hackathonId: freshInvite.hackathonId,
          role: Role.HACKER,
        },
      });

      await tx.hackerInvite.update({
        where: { token },
        data: { usedAt: new Date(), usedById: user.id },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_USED") {
      return {
        error: "This invite link is invalid or has already been used.",
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "An account with this email already exists." };
    }
    throw error;
  }

  await setActiveHackathon(invite.hackathonId);
  await signIn("credentials", {
    email,
    password: passwordSchema.data,
    redirectTo: "/dashboard",
  });

  return {};
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}
