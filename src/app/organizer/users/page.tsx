import { Users } from "lucide-react";
import { UserRoleButton } from "@/components/user-role-button";
import { requireOrganizer, roleLabels } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

const genderLabels = {
  WOMAN: "Woman",
  MAN: "Man",
  NON_BINARY: "Non-binary",
  PREFER_NOT_TO_SAY: "Prefer not to say",
} as const;

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

      <section className="dashboard-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-3 font-semibold">Complete name</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Gender</th>
                <th className="pb-3 font-semibold">City</th>
                <th className="pb-3 font-semibold">Major</th>
                <th className="pb-3 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-900">
                        {user.name ?? "Name not provided"}
                      </span>
                      <UserRoleButton
                        key={`${user.id}-${user.role}`}
                        userId={user.id}
                        currentRole={user.role}
                        isCurrentUser={user.id === currentUser.id}
                      />
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {user.gender ? genderLabels[user.gender] : "Not provided"}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {user.city ?? "Not provided"}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {user.major ?? "Not provided"}
                  </td>
                  <td className="py-4">
                    <span className={`role-badge role-badge-${user.role.toLowerCase()}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
