"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { deleteExpense, type ExpenseFormState } from "@/app/organizer/expenses/actions";

const initialState: ExpenseFormState = {};

export function DeleteExpenseButton({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  const [state, formAction, pending] = useActionState(deleteExpense, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-800"
        aria-label={`Delete ${description}`}
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(`Delete the expense "${description}"?`)) {
            event.preventDefault();
          }
        }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
