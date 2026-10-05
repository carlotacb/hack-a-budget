"use client";

import { useActionState, useState } from "react";
import {
  type BudgetFormState,
  updateBudgetAmounts,
} from "@/app/organizer/budget/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";
import { Toast } from "@/components/toast";
import { useAutoDismiss } from "@/components/use-auto-dismiss";

const initialState: BudgetFormState = {};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type Subcategory = {
  id: string;
  name: string;
  budgetCents: number;
  spentCents?: number;
};

type Category = {
  id: string;
  name: string;
  budgetCents: number;
  isUnexpected: boolean;
  spentCents?: number;
  subcategories: Subcategory[];
  department?: { name: string; color: string } | null;
};

type BudgetPlanFormProps = {
  budgetId: string;
  categories: Category[];
  readOnly?: boolean;
};

function DepartmentTag({
  department,
}: {
  department: { name: string; color: string } | null | undefined;
}) {
  if (!department) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: department.color }}
    >
      {department.name}
    </span>
  );
}

function toDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export function BudgetPlanForm({
  budgetId,
  categories,
  readOnly = false,
}: BudgetPlanFormProps) {
  const [state, formAction, pending] = useActionState(
    updateBudgetAmounts,
    initialState,
  );
  const showMessage = useAutoDismiss(state);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const category of categories) {
      if (category.subcategories.length === 0) {
        initial[`cat:${category.id}`] = toDollars(category.budgetCents);
      }
      for (const subcategory of category.subcategories) {
        initial[`sub:${subcategory.id}`] = toDollars(subcategory.budgetCents);
      }
    }
    return initial;
  });

  function categoryTotal(category: Category) {
    if (category.subcategories.length === 0) {
      return Number(values[`cat:${category.id}`] || 0);
    }
    return category.subcategories.reduce(
      (sum, subcategory) => sum + Number(values[`sub:${subcategory.id}`] || 0),
      0,
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormPendingOverlay />
      <input type="hidden" name="budgetId" value={budgetId} />

      {categories.map((category) => {
        const hasSubcategories = category.subcategories.length > 0;
        const total = categoryTotal(category);

        return (
          <section
            key={category.id}
            className={`rounded-2xl border p-5 ${
              category.isUnexpected
                ? "border-amber-200 bg-amber-50/60"
                : "border-slate-200"
            }`}
          >
            {hasSubcategories ? (
              <div className="field">
                <span className="flex flex-wrap items-center gap-2">
                  {category.name} budget
                  <DepartmentTag department={category.department} />
                </span>
                <p
                  aria-label={`${category.name} budget`}
                  className="rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {currency.format(total)}
                </p>
                <p className="text-xs font-normal text-slate-400">
                  Calculated automatically from subcategories.
                </p>
              </div>
            ) : (
              <>
                <div className="field">
                  <span className="flex flex-wrap items-center gap-2">
                    {category.name} budget
                    <DepartmentTag department={category.department} />
                  </span>
                  {readOnly ? (
                    <p className="rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                      {currency.format(total)}
                    </p>
                  ) : (
                    <input
                      name={`budgetCategory:${category.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={values[`cat:${category.id}`] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [`cat:${category.id}`]: event.target.value,
                        }))
                      }
                      required
                    />
                  )}
                </div>
                {typeof category.spentCents === "number" && (
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    {currency.format(category.spentCents / 100)} already spent
                  </p>
                )}
                {category.isUnexpected && (
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    Reserved for costs that don&apos;t fit any category.
                  </p>
                )}
              </>
            )}

            {hasSubcategories && (
              <div className="mt-4 grid gap-4 border-l-2 border-violet-100 pl-4 sm:grid-cols-2">
                {category.subcategories.map((subcategory) => (
                  <label key={subcategory.id} className="field">
                    <span>{subcategory.name}</span>
                    {readOnly ? (
                      <p className="rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                        {currency.format(
                          Number(values[`sub:${subcategory.id}`] || 0),
                        )}
                      </p>
                    ) : (
                      <input
                        name={`budgetSubcategory:${subcategory.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={values[`sub:${subcategory.id}`] ?? ""}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [`sub:${subcategory.id}`]: event.target.value,
                          }))
                        }
                        required
                      />
                    )}
                    {typeof subcategory.spentCents === "number" && (
                      <span className="text-xs font-normal text-slate-500">
                        {currency.format(subcategory.spentCents / 100)} already
                        spent
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {!readOnly && showMessage && state.error && (
        <Toast kind="error">{state.error}</Toast>
      )}
      {!readOnly && showMessage && state.success && (
        <Toast kind="success">Budget updated.</Toast>
      )}

      {!readOnly && (
        <button className="primary-button w-full" disabled={pending}>
          {pending ? "Saving..." : "Save budget"}
        </button>
      )}
    </form>
  );
}
