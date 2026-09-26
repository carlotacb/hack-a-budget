"use client";

import { Pencil, X } from "lucide-react";
import { useState } from "react";
import {
  ExpenseForm,
  type ExpenseFormCategory,
  type ExpenseFormValues,
} from "@/components/expense-form";

type EditExpenseButtonProps = {
  categories: ExpenseFormCategory[];
  expense: ExpenseFormValues;
};

export function EditExpenseButton({ categories, expense }: EditExpenseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${expense.description}`}
      >
        <Pencil size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-expense-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 id="edit-expense-title" className="text-lg font-semibold text-slate-900">
                Edit expense
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close edit expense dialog"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <ExpenseForm categories={categories} expense={expense} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
