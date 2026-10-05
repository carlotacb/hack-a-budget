import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-hackathon";
import { dashboardForRole } from "@/lib/organizer";

export default async function DashboardPage() {
  const current = await getCurrentMembership();

  if (!current) {
    redirect("/login");
  }

  if (!current.membership) {
    // Signed in but not part of any hackathon yet.
    redirect("/register");
  }

  redirect(dashboardForRole(current.membership.role));
}
