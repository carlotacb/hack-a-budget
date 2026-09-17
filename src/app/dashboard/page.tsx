import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dashboardForRole } from "@/lib/organizer";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.role) {
    redirect("/login");
  }

  redirect(dashboardForRole(session.user.role));
}
