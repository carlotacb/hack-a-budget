"use client";

import type { Role } from "@prisma/client";
import { Loader2, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { FormPendingOverlay } from "@/components/loading-overlay";
import {
  updateUserRole,
  type UserRoleFormState,
} from "@/app/organizer/actions";
import type { RoleSettingsMap } from "@/lib/role-settings";

const initialState: UserRoleFormState = {};

type Department = { id: string; name: string };

type UserRoleButtonProps = {
  userId: string;
  currentRole: Role;
  currentDepartmentId: string | null;
  isCurrentUser: boolean;
  roleSettings: RoleSettingsMap;
  departments: Department[];
};

export function UserRoleButton({
  userId,
  currentRole,
  currentDepartmentId,
  isCurrentUser,
  roleSettings,
  departments,
}: UserRoleButtonProps) {
  const [state, formAction, pending] = useActionState(
    updateUserRole,
    initialState,
  );
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);

  if (isCurrentUser) {
    return (
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
        Your account
      </span>
    );
  }

  // Only enabled roles are selectable — plus whatever role the user
  // currently has, even if it's since been disabled, so the dropdown never
  // silently hides their actual role.
  const roleOptions = (
    Object.entries(roleSettings) as [Role, RoleSettingsMap[Role]][]
  )
    .filter(([value, setting]) => setting.enabled || value === currentRole)
    .map(([value, setting]) => ({ value, label: setting.label }));

  const requiresDepartment = roleSettings[selectedRole]?.requiresDepartment;

  return (
    <form
      action={formAction}
      className="flex flex-col items-end gap-2 text-right"
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const nextRole = formData.get("role") as Role;
        const currentLabel = roleSettings[currentRole]?.label ?? currentRole;
        const nextLabel = roleSettings[nextRole]?.label ?? nextRole;

        if (requiresDepartment && !formData.get("departmentId")) {
          event.preventDefault();
          window.alert("Select a department for this role.");
          return;
        }

        if (
          (nextRole === currentRole &&
            (formData.get("departmentId") || null) ===
              (currentDepartmentId ?? null)) ||
          !window.confirm(
            `Change this user's role from ${currentLabel} to ${nextLabel}? Their access will update immediately.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <FormPendingOverlay label="Updating role…" />
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-center gap-2">
        <select
          name="role"
          defaultValue={currentRole}
          onChange={(event) => setSelectedRole(event.target.value as Role)}
          className="role-select"
          aria-label="User role"
          disabled={pending}
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="secondary-button !h-9 !px-3 text-xs"
          disabled={pending}
          aria-label={pending ? "Saving role..." : "Save role"}
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={14} aria-hidden="true" />
          )}
        </button>
      </div>
      {requiresDepartment && (
        <select
          name="departmentId"
          defaultValue={currentDepartmentId ?? ""}
          className="role-select"
          aria-label="Department"
          disabled={pending}
        >
          <option value="" disabled>
            Select a department
          </option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      )}
      {state.error && (
        <p role="alert" className="mt-1 max-w-48 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
