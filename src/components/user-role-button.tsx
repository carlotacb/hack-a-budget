"use client";

import { useActionState } from "react";
import {
  promoteToOrganizer,
  type UserRoleFormState,
} from "@/app/organizer/actions";

const initialState: UserRoleFormState = {};

export function UserRoleButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    promoteToOrganizer,
    initialState,
  );

  return (
    <form action={formAction} className="text-right">
      <input type="hidden" name="userId" value={userId} />
      <button
        className="secondary-button !h-9 !px-3 text-xs"
        disabled={pending}
      >
        {pending ? "Promoting..." : "Make organizer"}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 max-w-48 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
