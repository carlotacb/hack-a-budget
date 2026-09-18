"use client";

import { Info, Search, X } from "lucide-react";
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
  const [detailsUserId, setDetailsUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      const email = user.email.toLowerCase();
      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
  }, [users, query]);

  const detailsUser = users.find((user) => user.id === detailsUserId) ?? null;

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
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-3 font-semibold">Complete name</th>
              <th className="pb-3 font-semibold">Email</th>
              <th className="pb-3 font-semibold">Role</th>
              <th className="pb-3 font-semibold">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {user.name ?? "Name not provided"}
                    </span>
                    <span
                      className={`role-badge role-badge-${user.role.toLowerCase()}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  </div>
                </td>
                <td className="py-4 pr-4 text-sm text-slate-600">
                  {user.email}
                </td>
                <td className="py-4 pr-4">
                  <UserRoleButton
                    key={`${user.id}-${user.role}`}
                    userId={user.id}
                    currentRole={user.role}
                    isCurrentUser={user.id === currentUserId}
                  />
                </td>
                <td className="py-4 text-right">
                  <button
                    type="button"
                    onClick={() => setDetailsUserId(user.id)}
                    className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
                    aria-label={`View details for ${user.name ?? user.email}`}
                  >
                    <Info size={18} aria-hidden="true" />
                  </button>
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

      {detailsUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-details-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    id="user-details-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    {detailsUser.name ?? "Name not provided"}
                  </h3>
                  <span
                    className={`role-badge role-badge-${detailsUser.role.toLowerCase()}`}
                  >
                    {roleLabels[detailsUser.role]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {detailsUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsUserId(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close user details"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <dl className="space-y-4 p-5">
              <Detail
                label="Gender"
                value={
                  detailsUser.gender
                    ? genderLabels[detailsUser.gender]
                    : "Not provided"
                }
              />
              <Detail label="City" value={detailsUser.city ?? "Not provided"} />
              <Detail
                label="Major"
                value={detailsUser.major ?? "Not provided"}
              />
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
