"use client";

import { useActionState } from "react";
import {
  type BudgetFormState,
  updateBudgets,
} from "@/app/organizer/budget/actions";

const initialState: BudgetFormState = {};

type BudgetFormProps = {
  categories: {
    id: string;
    name: string;
    budgetCents: number;
    subcategories: {
      id: string;
      name: string;
      budgetCents: number;
    }[];
  }[];
};

export function BudgetForm({ categories }: BudgetFormProps) {
  const [state, formAction, pending] = useActionState(
    updateBudgets,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {categories.map((category) => (
        <section key={category.id} className="rounded-2xl border border-slate-200 p-5">
          <label className="field">
            <span>{category.name} budget</span>
            <input
              name={`category:${category.id}`}
              type="number"
              min="0"
              step="0.01"
              defaultValue={(category.budgetCents / 100).toFixed(2)}
              required
            />
          </label>

          {category.subcategories.length > 0 && (
            <div className="mt-4 grid gap-4 border-l-2 border-violet-100 pl-4 sm:grid-cols-2">
              {category.subcategories.map((subcategory) => (
                <label key={subcategory.id} className="field">
                  <span>{subcategory.name}</span>
                  <input
                    name={`subcategory:${subcategory.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={(subcategory.budgetCents / 100).toFixed(2)}
                    required
                  />
                </label>
              ))}
            </div>
          )}
        </section>
      ))}

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Budgets updated.
        </p>
      )}

      <button className="primary-button w-full" disabled={pending}>
        {pending ? "Saving..." : "Save budgets"}
      </button>
    </form>
  );
}
