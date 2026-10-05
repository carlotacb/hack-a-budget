"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { FormPendingOverlay } from "@/components/loading-overlay";
import {
  deleteOrganizerUser,
  type DeleteUserFormState,
} from "@/app/organizer/actions";

const initialState: DeleteUserFormState = {};

type DeleteUserButtonProps = {
  userId: string;
  userLabel: string;
};

export function DeleteUserButton({ userId, userLabel }: DeleteUserButtonProps) {
  const [state, formAction, pending] = useActionState(
    deleteOrganizerUser,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${userLabel} from this hackathon? This cannot be undone.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <FormPendingOverlay label="Removing user…" />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
        disabled={pending}
        aria-label={`Remove ${userLabel}`}
        title="Remove from this hackathon"
      >
        {pending ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 size={18} aria-hidden="true" />
        )}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 max-w-48 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
