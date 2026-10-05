"use client";

import { useRouter } from "next/navigation";

type Budget = {
  id: string;
  name: string;
  isActive: boolean;
};

type BudgetSelectorProps = {
  budgets: Budget[];
  selectedBudgetId: string;
};

/** Lets organizers pick which budget plan the dashboard stats describe —
 * defaults to the active budget, but any past budget can be selected to
 * see how that period went. */
export function BudgetSelector({ budgets, selectedBudgetId }: BudgetSelectorProps) {
  const router = useRouter();

  if (budgets.length === 0) {
    return null;
  }

  return (
    <label className="field w-full max-w-xs sm:w-56">
      <span className="sr-only">Budget</span>
      <select
        value={selectedBudgetId}
        onChange={(event) => {
          router.push(`/organizer?budgetId=${event.target.value}`);
        }}
      >
        {budgets.map((budget) => (
          <option key={budget.id} value={budget.id}>
            {budget.name}
            {budget.isActive ? " (active)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
