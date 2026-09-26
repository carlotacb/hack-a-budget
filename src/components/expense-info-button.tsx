"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "@/lib/travel";

type ExpenseInfoButtonProps = {
  expense: {
    description: string;
    vendor: string | null;
    categoryName: string;
    subcategoryName: string | null;
    departmentName: string | null;
    incurredAt: string;
    amountCents: number;
  };
  relatedBudgetName: string | null;
  scopeBudgetCents: number | null;
  scopeSpentCents: number;
  percentOfBudget: number | null;
};

export function ExpenseInfoButton({
  expense,
  relatedBudgetName,
  scopeBudgetCents,
  scopeSpentCents,
  percentOfBudget,
}: ExpenseInfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
        onClick={() => setOpen(true)}
        aria-label={`View details for ${expense.description}`}
      >
        <Info size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-info-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 id="expense-info-title" className="text-lg font-semibold text-slate-900">
                Expense details
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close expense details dialog"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <dl className="space-y-3 overflow-y-auto p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Description</dt>
                <dd className="text-right text-slate-900">{expense.description}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Vendor</dt>
                <dd className="text-right text-slate-900">
                  {expense.vendor ?? "Not provided"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Category</dt>
                <dd className="text-right text-slate-900">
                  {expense.categoryName}
                  {expense.subcategoryName ? ` / ${expense.subcategoryName}` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Department</dt>
                <dd className="text-right text-slate-900">
                  {expense.departmentName ?? "Not assigned"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Date</dt>
                <dd className="text-right text-slate-900">
                  {new Date(expense.incurredAt).toLocaleDateString("en-GB")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-medium text-slate-500">Amount</dt>
                <dd className="text-right font-semibold text-slate-900">
                  {formatMoney(expense.amountCents)}
                </dd>
              </div>

              <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Related budget</dt>
                  <dd className="text-right text-slate-900">
                    {relatedBudgetName ?? "No active budget"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">
                    Budget allocated to this{" "}
                    {expense.subcategoryName ? "subcategory" : "category"}
                  </dt>
                  <dd className="text-right text-slate-900">
                    {scopeBudgetCents === null ? "Not budgeted" : formatMoney(scopeBudgetCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">Total spent so far</dt>
                  <dd className="text-right text-slate-900">
                    {formatMoney(scopeSpentCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-slate-500">% of budget used</dt>
                  <dd className="text-right font-semibold text-slate-900">
                    {percentOfBudget === null ? "N/A" : `${percentOfBudget.toFixed(1)}%`}
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
