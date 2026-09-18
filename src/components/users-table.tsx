"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { UserRoleButton } from "@/components/user-role-button";
import { roleLabels } from "@/lib/organizer";
import type { Gender, Role } from "@prisma/client";

const genderLabels: Record<Gender, string> = {
  WOMAN: "Woman",
  MAN: "Man",
  NON_BINARY: "Non-binary",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

type OrganizerUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  gender: Gender | null;
  city: string | null;
  major: string | null;
};

type UsersTableProps = {
  users: OrganizerUser[];
  currentUserId: string;
};

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      const email = user.email.toLowerCase();
      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
  }, [users, query]);

  return (
    <section className="dashboard-card">
      <div className="mb-5 flex max-w-sm items-center gap-2 rounded-xl border border-slate-200 px-3 transition-colors focus-within:border-violet-500 focus-within:ring-3 focus-within:ring-violet-500/10">
        <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          className="h-12 w-full border-0 bg-transparent p-0 text-sm outline-none"
          aria-label="Search users by name or email"
        />
      </div>

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
            {filteredUsers.map((user) => (
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
                      isCurrentUser={user.id === currentUserId}
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
        {filteredUsers.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No users match &quot;{query}&quot;.
          </p>
        )}
      </div>
    </section>
  );
}
