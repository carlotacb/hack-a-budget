import { Users } from "lucide-react";
import { UsersTable } from "@/components/users-table";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export default async function OrganizerUsersPage() {
  const currentUser = await requireOrganizer(["ADMIN"]);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      gender: true,
      city: true,
      major: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Access management</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Registered users
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            New accounts start as hackers. Assign the access level each team
            member needs.
          </p>
        </div>
        <Users className="hidden text-slate-400 sm:block" size={32} />
      </div>

      <UsersTable users={users} currentUserId={currentUser.id} />
    </main>
  );
}
