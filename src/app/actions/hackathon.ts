"use server";

import { redirect } from "next/navigation";
import {
  getCurrentMembership,
  setActiveHackathon,
} from "@/lib/current-hackathon";
import { dashboardForRole } from "@/lib/organizer";

/** Switches the signed-in user's active hackathon (used by the hackathon
 * switcher next to the profile button). Only hackathons the user actually
 * belongs to can be selected; anything else is silently ignored. */
export async function switchActiveHackathon(hackathonId: string) {
  const current = await getCurrentMembership();

  if (!current) {
    redirect("/login");
  }

  const target = current.memberships.find(
    (membership) => membership.hackathonId === hackathonId,
  );

  if (!target) {
    return;
  }

  await setActiveHackathon(hackathonId);
  redirect(dashboardForRole(target.role));
}
