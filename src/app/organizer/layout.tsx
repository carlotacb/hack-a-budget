import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { OrganizerNav } from "@/components/organizer-nav";
import {
  organizerRoles,
  requireOrganizer,
  roleLabels,
} from "@/lib/organizer";

export default async function OrganizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireOrganizer(organizerRoles);

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppHeader name={user.name} role={roleLabels[user.role]} />
      <OrganizerNav role={user.role} />
      {children}
    </div>
  );
}
