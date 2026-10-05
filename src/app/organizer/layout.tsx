import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { OrganizerNav } from "@/components/organizer-nav";
import { organizerRoles, requireOrganizer } from "@/lib/organizer";
import { isTravelReimbursementEnabled } from "@/lib/hackathon";
import { getRoleSettings } from "@/lib/role-settings";

export default async function OrganizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireOrganizer(organizerRoles);
  const travelReimbursementEnabled = await isTravelReimbursementEnabled(
    user.hackathonId,
  );
  const roleSettings = getRoleSettings(user.hackathonSettings);
  const permissions = roleSettings[user.role].permissions;

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppHeader
        name={user.name}
        role={roleSettings[user.role].label}
        hackathons={user.hackathons}
        activeHackathonId={user.hackathonId}
      />
      <OrganizerNav
        role={user.role}
        travelReimbursementEnabled={travelReimbursementEnabled}
        canSeeBudget={permissions.seeBudget}
      />
      {children}
    </div>
  );
}
