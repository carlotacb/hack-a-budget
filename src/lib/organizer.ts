import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  getCurrentMembership,
  toHackathonOptions,
} from "@/lib/current-hackathon";

export const organizerRoles = [
  "ADMIN",
  "DIRECTOR",
  "ORGANIZER",
  "ORGANIZER_LEAD",
] as const satisfies readonly Role[];

export { roleLabels } from "@/lib/roles";

export function dashboardForRole(role: Role) {
  return role === "HACKER" ? "/hacker" : "/organizer";
}

/** Requires the signed-in user to have an organizer-level role in their
 * active hackathon. Redirects to /login (no session / no membership) or to
 * the hacker dashboard (wrong role) otherwise. */
export async function requireOrganizer(
  allowedRoles: readonly Role[] = organizerRoles,
) {
  const current = await getCurrentMembership();

  if (!current || !current.membership) {
    redirect("/login");
  }

  const { membership } = current;

  if (!allowedRoles.includes(membership.role)) {
    redirect(dashboardForRole(membership.role));
  }

  return {
    id: current.userId,
    name: membership.user?.name ?? null,
    role: membership.role,
    hackathonId: membership.hackathonId,
    hackathonName: membership.hackathon.name,
    hackathonSettings: membership.hackathon.settings,
    hackathons: toHackathonOptions(current.memberships),
    departmentId: membership.departmentId,
    departmentName: membership.department?.name ?? null,
  };
}

/** Returns the current user's id if they hold one of the allowed roles in
 * their active hackathon, plus the hackathon id to scope queries by. */
export async function getOrganizerId(allowedRoles: readonly Role[]) {
  const current = await getCurrentMembership();

  if (!current?.membership) {
    return null;
  }

  if (!allowedRoles.includes(current.membership.role)) {
    return null;
  }

  return {
    userId: current.userId,
    hackathonId: current.membership.hackathonId,
  };
}
