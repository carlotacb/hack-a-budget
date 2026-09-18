"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ExpenseForm } from "@/components/expense-form";

type AddExpenseButtonProps = {
  categories: {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
  }[];
  departments: { id: string; name: string }[];
};

export function AddExpenseButton({
  categories,
  departments,
}: AddExpenseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="primary-button" onClick={() => setOpen(true)}>
        <Plus size={18} />
        Add expense
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-expense-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 id="add-expense-title" className="text-lg font-semibold text-slate-900">
                Add new expense
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close add expense dialog"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <ExpenseForm categories={categories} departments={departments} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
