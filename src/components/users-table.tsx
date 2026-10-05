"use client";

import { Info, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DeleteUserButton } from "@/components/delete-user-button";
import { UserRoleButton } from "@/components/user-role-button";
import type { RoleSettingsMap } from "@/lib/role-settings";
import type { Diet, Gender, Role, TShirtSize } from "@prisma/client";

const genderLabels: Record<Gender, string> = {
  WOMAN: "Woman",
  MAN: "Man",
  NON_BINARY: "Non-binary",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

const dietLabels: Record<Diet, string> = {
  OMNIVORE: "Omnivore",
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  GLUTEN_FREE: "Gluten-free",
  HALAL: "Halal",
  KOSHER: "Kosher",
  OTHER: "Other",
};

const tshirtSizeLabels: Record<TShirtSize, string> = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
};

type OrganizerUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  departmentId: string | null;
  gender: Gender | null;
  diet: Diet | null;
  tshirtSize: TShirtSize | null;
};

type Department = { id: string; name: string };

type UsersTableProps = {
  users: OrganizerUser[];
  currentUserId: string;
  roleSettings: RoleSettingsMap;
  departments: Department[];
};

export function UsersTable({
  users,
  currentUserId,
  roleSettings,
  departments,
}: UsersTableProps) {
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
              <th className="pb-3 font-semibold">
                <span className="sr-only">Remove</span>
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
                      {roleSettings[user.role]?.label ?? user.role}
                    </span>
                  </div>
                </td>
                <td className="py-4 pr-4 text-sm text-slate-600">
                  {user.email}
                </td>
                <td className="py-4 pr-4">
                  <UserRoleButton
                    key={`${user.id}-${user.role}-${user.departmentId}`}
                    userId={user.id}
                    currentRole={user.role}
                    currentDepartmentId={user.departmentId}
                    isCurrentUser={user.id === currentUserId}
                    roleSettings={roleSettings}
                    departments={departments}
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
                <td className="py-4 text-right">
                  {user.id === currentUserId ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <DeleteUserButton
                      userId={user.id}
                      userLabel={user.name ?? user.email}
                    />
                  )}
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
                    {roleSettings[detailsUser.role]?.label ?? detailsUser.role}
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
              <Detail
                label="Diet"
                value={
                  detailsUser.diet ? dietLabels[detailsUser.diet] : "Not provided"
                }
              />
              <Detail
                label="T-shirt size"
                value={
                  detailsUser.tshirtSize
                    ? tshirtSizeLabels[detailsUser.tshirtSize]
                    : "Not provided"
                }
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
