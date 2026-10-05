import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** A user can belong to several hackathons; the cookie remembers which one
 * is "active" for the current browser session so every page/action can
 * scope its data without a hackathon id in every URL. */
export const ACTIVE_HACKATHON_COOKIE = "activeHackathonId";

export async function getMemberships(userId: string) {
  return prisma.hackathonMembership.findMany({
    where: { userId },
    include: { hackathon: true, user: true, department: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Resolves the signed-in user plus their active hackathon membership.
 * Returns null if there is no session or the user has no memberships yet. */
export async function getCurrentMembership() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const memberships = await getMemberships(session.user.id);

  if (memberships.length === 0) {
    return { userId: session.user.id, membership: null, memberships };
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_HACKATHON_COOKIE)?.value;
  const active =
    memberships.find((membership) => membership.hackathonId === activeId) ??
    memberships[0];

  return { userId: session.user.id, membership: active, memberships };
}

export async function setActiveHackathon(hackathonId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_HACKATHON_COOKIE, hackathonId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export type HackathonOption = {
  hackathonId: string;
  hackathonName: string;
  role: import("@prisma/client").Role;
};

/** Shapes a user's memberships into the plain, client-safe option list the
 * hackathon switcher renders (one entry per hackathon they belong to). */
export function toHackathonOptions(
  memberships: Awaited<ReturnType<typeof getMemberships>>,
): HackathonOption[] {
  return memberships.map((membership) => ({
    hackathonId: membership.hackathonId,
    hackathonName: membership.hackathon.name,
    role: membership.role,
  }));
}
