import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const organizerRoles = [
  "ADMIN",
  "DIRECTOR",
  "ORGANIZER",
] as const satisfies readonly Role[];

export { roleLabels } from "@/lib/roles";

export function dashboardForRole(role: Role) {
  return role === "HACKER" ? "/hacker" : "/organizer";
}

export async function requireOrganizer(
  allowedRoles: readonly Role[] = organizerRoles,
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(user.role)) {
    redirect(dashboardForRole(user.role));
  }

  return user;
}

export async function getOrganizerId(allowedRoles: readonly Role[]) {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user && allowedRoles.includes(user.role) ? session.user.id : null;
}
