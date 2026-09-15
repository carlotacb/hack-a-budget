"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import {
  addExpense,
  type ExpenseFormState,
} from "@/app/organizer/actions";

const initialState: ExpenseFormState = {};

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(addExpense, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span>Description</span>
          <input
            name="description"
            placeholder="e.g. Main venue deposit"
            required
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select name="category" defaultValue="Venue">
            <option>Venue</option>
            <option>Catering</option>
            <option>Prizes</option>
            <option>Marketing</option>
            <option>Other</option>
          </select>
        </label>
        <label className="field">
          <span>Amount</span>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            required
          />
        </label>
        <label className="field sm:col-span-2">
          <span>Date</span>
          <input
            name="incurredAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button className="primary-button w-full" disabled={pending}>
        <Plus size={18} />
        {pending ? "Adding..." : "Add expense"}
      </button>
    </form>
  );
}
