"use client";

import { useActionState, useMemo, useState } from "react";
import { Paperclip, Plus, Save } from "lucide-react";
import {
  addExpense,
  updateExpense,
  type ExpenseFormState,
} from "@/app/organizer/expenses/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";

const initialState: ExpenseFormState = {};

export type ExpenseFormCategory = {
  id: string;
  name: string;
  departmentName: string;
  departmentColor?: string;
  subcategories: {
    id: string;
    name: string;
    departmentName: string;
    departmentColor?: string;
  }[];
};

export type ExpenseFormBudget = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ExpenseFormValues = {
  id: string;
  description: string;
  categoryId: string | null;
  subcategoryId: string | null;
  budgetId?: string | null;
  amountCents: number;
  incurredAt: string;
  vendor: string | null;
};

type ExpenseFormProps = {
  categories: ExpenseFormCategory[];
  budgets?: ExpenseFormBudget[];
  expense?: ExpenseFormValues;
};

function today() {
  const date = new Date();
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
}

function formatDate(isoDate: string) {
  const date = new Date(isoDate);
  return [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    date.getUTCFullYear(),
  ].join("/");
}

export function ExpenseForm({
  categories,
  budgets = [],
  expense,
}: ExpenseFormProps) {
  const isEditing = Boolean(expense);
  const action = isEditing ? updateExpense : addExpense;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [categoryId, setCategoryId] = useState(
    expense?.categoryId ?? categories[0]?.id ?? "",
  );
  const [subcategoryId, setSubcategoryId] = useState(
    expense?.subcategoryId ?? "",
  );
  const [budgetId, setBudgetId] = useState(
    expense?.budgetId ??
      budgets.find((budget) => budget.isActive)?.id ??
      budgets[0]?.id ??
      "",
  );
  const [ticketName, setTicketName] = useState("");

  const category = useMemo(
    () => categories.find((candidate) => candidate.id === categoryId),
    [categories, categoryId],
  );
  const subcategories = category?.subcategories ?? [];
  const hasSubcategories = subcategories.length > 0;

  const department = hasSubcategories
    ? (subcategories.find((subcategory) => subcategory.id === subcategoryId) ??
      subcategories[0])
    : category;
  const departmentName = department?.departmentName ?? "";
  const departmentColor = department?.departmentColor ?? "#64748b";

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    const nextCategory = categories.find(
      (candidate) => candidate.id === nextCategoryId,
    );
    setSubcategoryId(nextCategory?.subcategories[0]?.id ?? "");
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormPendingOverlay />
      {isEditing && <input type="hidden" name="id" value={expense!.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        {budgets.length > 0 && (
          <label className="field sm:col-span-2">
            <span>Budget</span>
            <select
              name="budgetId"
              value={budgetId}
              onChange={(event) => setBudgetId(event.target.value)}
              required
            >
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.name}
                  {budget.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field sm:col-span-2">
          <span>Description</span>
          <input
            name="description"
            placeholder="e.g. Main venue deposit"
            defaultValue={expense?.description}
            required
          />
        </label>

        <label className="field">
          <span>Category</span>
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) => handleCategoryChange(event.target.value)}
            required
          >
            {categories.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>

        {hasSubcategories && (
          <label className="field">
            <span>Subcategory</span>
            <select
              key={categoryId}
              name="subcategoryId"
              value={subcategoryId}
              onChange={(event) => setSubcategoryId(event.target.value)}
              required
            >
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="field">
          <span>Department</span>
          <span className="flex min-h-12 items-center">
            <span
              key={departmentName}
              className="rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: departmentColor }}
            >
              {departmentName}
            </span>
          </span>
        </div>

        <label className="field">
          <span>Amount (EUR)</span>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            defaultValue={
              expense ? (expense.amountCents / 100).toFixed(2) : undefined
            }
            required
          />
        </label>

        <label className="field">
          <span>Date</span>
          <input
            name="incurredAt"
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/YYYY"
            pattern="\d{2}/\d{2}/\d{4}"
            defaultValue={expense ? formatDate(expense.incurredAt) : today()}
            required
          />
        </label>

        <label className="field">
          <span>Vendor</span>
          <input
            name="vendor"
            placeholder="Vendor name"
            defaultValue={expense?.vendor ?? ""}
            required
          />
        </label>

        <label className="field sm:col-span-2">
          <span>Ticket{isEditing ? " (leave empty to keep the current one)" : ""}</span>
          <span className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-600 hover:border-violet-400">
            <Paperclip size={17} />
            {ticketName || "Upload PDF or image (max 5 MB)"}
            <input
              name="ticket"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(event) =>
                setTicketName(event.target.files?.[0]?.name ?? "")
              }
            />
          </span>
        </label>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {isEditing ? "Expense updated successfully." : "Expense added successfully."}
        </p>
      )}

      <button className="primary-button w-full" disabled={pending}>
        {isEditing ? <Save size={18} /> : <Plus size={18} />}
        {pending
          ? isEditing
            ? "Saving..."
            : "Adding..."
          : isEditing
            ? "Save changes"
            : "Add expense"}
      </button>
    </form>
  );
}
