"use client";

import type { Role } from "@prisma/client";
import { useActionState } from "react";
import {
  updateUserRole,
  type UserRoleFormState,
} from "@/app/organizer/actions";

const initialState: UserRoleFormState = {};

type UserRoleButtonProps = {
  userId: string;
  currentRole: Role;
  isCurrentUser: boolean;
};

const roleOptions: { value: Role; label: string }[] = [
  { value: "HACKER", label: "Hacker" },
  { value: "ORGANIZER", label: "Organizer" },
  { value: "DIRECTOR", label: "Director" },
  { value: "ADMIN", label: "Admin" },
];

export function UserRoleButton({
  userId,
  currentRole,
  isCurrentUser,
}: UserRoleButtonProps) {
  const [state, formAction, pending] = useActionState(
    updateUserRole,
    initialState,
  );

  if (isCurrentUser) {
    return (
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
        Your account
      </span>
    );
  }

  return (
    <form
      action={formAction}
      className="flex items-center gap-2 text-right"
      onSubmit={(event) => {
        const selectedRole = new FormData(event.currentTarget).get(
          "role",
        ) as Role;
        const currentLabel = roleOptions.find(
          ({ value }) => value === currentRole,
        )?.label;
        const nextLabel = roleOptions.find(
          ({ value }) => value === selectedRole,
        )?.label;

        if (
          selectedRole === currentRole ||
          !window.confirm(
            `Change this user's role from ${currentLabel} to ${nextLabel}? Their access will update immediately.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
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
      >
        {pending ? "Updating..." : "Save"}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 max-w-48 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
