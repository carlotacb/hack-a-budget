"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  DEFAULT_ROLE_SETTINGS,
  PERMISSION_KEYS,
  ROLE_ORDER,
  UNIMPLEMENTED_PERMISSIONS,
  permissionLabels,
  type RoleSettingsMap,
} from "@/lib/role-settings";
import type { Role } from "@prisma/client";

type RoleSettingsFieldsProps = {
  initialSettings?: RoleSettingsMap;
};

// Admin and Participant always exist for every hackathon — Admin is fully
// fixed, Participant can only be renamed. Every other role is optional and
// gets added/removed the same way departments/categories do, so each
// hackathon can end up with a different number of them.
const FIXED_ROLES = ["ADMIN", "HACKER"] as const satisfies readonly Role[];
const ADDABLE_ROLES = ROLE_ORDER.filter(
  (role) => !FIXED_ROLES.includes(role as (typeof FIXED_ROLES)[number]),
);

function PermissionsGrid({
  role,
  settings,
  isEnabled,
}: {
  role: Role;
  settings: RoleSettingsMap[Role];
  isEnabled: boolean;
}) {
  if (!settings.canEditPermissions) return null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {PERMISSION_KEYS.map((key) => (
        <label
          key={key}
          className="flex items-center gap-2 text-sm text-slate-600"
        >
          <input
            type="checkbox"
            name={`role:${role}:permission:${key}`}
            defaultChecked={settings.permissions[key]}
            disabled={!isEnabled || role === "ADMIN"}
          />
          {permissionLabels[key]}
          {UNIMPLEMENTED_PERMISSIONS.includes(key) && (
            <span className="text-xs text-slate-400">(soon)</span>
          )}
        </label>
      ))}
    </div>
  );
}

/** Renders the "Roles & permissions" editor used both at hackathon
 * registration and in the Settings "Roles" tab. Field names follow the
 * `role:{ROLE}:...` convention `parseRoleSettingsFromFormData` reads back.
 * Admin and Participant are always present; the remaining roles are added
 * or removed on demand, like the departments/categories tag lists. */
export function RoleSettingsFields({
  initialSettings = DEFAULT_ROLE_SETTINGS,
}: RoleSettingsFieldsProps) {
  const [addedRoles, setAddedRoles] = useState<Role[]>(() =>
    ADDABLE_ROLES.filter((role) => initialSettings[role].enabled),
  );
  const [needsDepartment, setNeedsDepartment] = useState<
    Record<Role, boolean>
  >(
    () =>
      Object.fromEntries(
        ROLE_ORDER.map((role) => [
          role,
          initialSettings[role].requiresDepartment,
        ]),
      ) as Record<Role, boolean>,
  );
  const availableToAdd = ADDABLE_ROLES.filter(
    (role) => !addedRoles.includes(role),
  );
  const [pendingRole, setPendingRole] = useState<Role | "">(
    availableToAdd[0] ?? "",
  );

  function addRole(role: Role) {
    setAddedRoles((current) => [...current, role]);
    const next = availableToAdd.filter((r) => r !== role);
    setPendingRole(next[0] ?? "");
  }

  function removeRole(role: Role) {
    setAddedRoles((current) => current.filter((r) => r !== role));
    setPendingRole((current) => current || role);
  }

  return (
    <div className="space-y-4">
      {FIXED_ROLES.map((role) => {
        const setting = initialSettings[role];

        return (
          <div key={role} className="rounded-2xl border border-slate-200 p-4">
            <label className="field min-w-40 flex-[2]">
              <span>Role name</span>
              <input
                name={`role:${role}:label`}
                defaultValue={setting.label}
                disabled={!setting.canRename}
                required
              />
            </label>
            <PermissionsGrid role={role} settings={setting} isEnabled />
          </div>
        );
      })}

      {addedRoles.map((role) => {
        const setting = initialSettings[role] ?? DEFAULT_ROLE_SETTINGS[role];

        return (
          <div
            key={role}
            className="rounded-2xl border border-slate-200 p-4 transition-colors"
          >
            <input type="hidden" name={`role:${role}:enabled`} value="on" />
            <div className="flex flex-wrap items-end gap-3">
              <label className="field min-w-40 flex-[2]">
                <span>Role name</span>
                <input
                  name={`role:${role}:label`}
                  defaultValue={setting.label}
                  required
                />
              </label>

              {setting.canToggleDepartment && (
                <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name={`role:${role}:requiresDepartment`}
                    defaultChecked={setting.requiresDepartment}
                    onChange={(event) =>
                      setNeedsDepartment((current) => ({
                        ...current,
                        [role]: event.target.checked,
                      }))
                    }
                  />
                  Related to a department
                </label>
              )}

              <button
                type="button"
                onClick={() => removeRole(role)}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label={`Remove ${setting.label}`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>

            {needsDepartment[role] && (
              <p className="mt-2 text-xs text-slate-500">
                When assigning this role to a user, an organizer will also
                pick one of the hackathon&apos;s departments. Department-scoped
                permissions below then apply only to that department.
              </p>
            )}

            <PermissionsGrid role={role} settings={setting} isEnabled />
          </div>
        );
      })}

      {availableToAdd.length > 0 && (
        <div className="flex items-end gap-3 rounded-2xl border border-dashed border-slate-300 p-4">
          <label className="field min-w-40 flex-1">
            <span>Add a role</span>
            <select
              value={pendingRole}
              onChange={(event) => setPendingRole(event.target.value as Role)}
            >
              {availableToAdd.map((role) => (
                <option key={role} value={role}>
                  {DEFAULT_ROLE_SETTINGS[role].label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => pendingRole && addRole(pendingRole)}
            disabled={!pendingRole}
            className="secondary-button h-12 shrink-0 px-4 text-sm"
          >
            + Add
          </button>
        </div>
      )}
    </div>
  );
}
