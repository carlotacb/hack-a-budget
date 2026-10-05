import { Users } from "lucide-react";
import { InviteLinksPanel } from "@/components/invite-links-panel";
import { UsersTable } from "@/components/users-table";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { getRoleSettings } from "@/lib/role-settings";

export default async function OrganizerUsersPage() {
  const currentUser = await requireOrganizer(["ADMIN"]);
  const roleSettings = getRoleSettings(currentUser.hackathonSettings);

  const [memberships, invites, departments] = await Promise.all([
    prisma.hackathonMembership.findMany({
      where: { hackathonId: currentUser.hackathonId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            diet: true,
            tshirtSize: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.hackerInvite.findMany({
      where: { usedAt: null, hackathonId: currentUser.hackathonId },
      orderBy: { createdAt: "desc" },
      select: { id: true, token: true, createdAt: true },
    }),
    prisma.department.findMany({
      where: { hackathonId: currentUser.hackathonId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const users = memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    departmentId: membership.departmentId,
    gender: membership.user.gender,
    diet: membership.user.diet,
    tshirtSize: membership.user.tshirtSize,
    createdAt: membership.user.createdAt,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Access management</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Registered users
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            New accounts start as participants. Assign the access level each
            team member needs.
          </p>
        </div>
        <Users className="hidden text-slate-400 sm:block" size={32} />
      </div>

      <UsersTable
        users={users}
        currentUserId={currentUser.id}
        roleSettings={roleSettings}
        departments={departments}
      />

      <div className="mt-8">
        <InviteLinksPanel invites={invites} />
      </div>
    </main>
  );
}
