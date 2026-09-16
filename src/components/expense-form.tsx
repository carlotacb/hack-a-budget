"use client";

import { useActionState, useMemo, useState } from "react";
import { Paperclip, Plus } from "lucide-react";
import {
  addExpense,
  type ExpenseFormState,
} from "@/app/organizer/expenses/actions";

const initialState: ExpenseFormState = {};

type ExpenseFormProps = {
  categories: {
    id: string;
    name: string;
    subcategories: { id: string; name: string }[];
  }[];
  departments: { id: string; name: string }[];
};

function today() {
  const date = new Date();
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
}

export function ExpenseForm({
  categories,
  departments,
}: ExpenseFormProps) {
  const [state, formAction, pending] = useActionState(addExpense, initialState);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [ticketName, setTicketName] = useState("");
  const subcategories = useMemo(
    () =>
      categories.find((category) => category.id === categoryId)
        ?.subcategories ?? [],
    [categories, categoryId],
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
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
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Subcategory</span>
          <select key={categoryId} name="subcategoryId" defaultValue="">
            <option value="">No subcategory</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
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

        <label className="field">
          <span>Date</span>
          <input
            name="incurredAt"
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/YYYY"
            pattern="\d{2}/\d{2}/\d{4}"
            defaultValue={today()}
            required
          />
        </label>

        <label className="field">
          <span>Vendor</span>
          <input name="vendor" placeholder="Vendor name" required />
        </label>

        <label className="field">
          <span>Department</span>
          <select name="departmentId" defaultValue="" required>
            <option value="" disabled>
              Select a department
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field sm:col-span-2">
          <span>Ticket</span>
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
          Expense added successfully.
        </p>
      )}

      <button className="primary-button w-full" disabled={pending}>
        <Plus size={18} />
        {pending ? "Adding..." : "Add expense"}
      </button>
    </form>
  );
}
