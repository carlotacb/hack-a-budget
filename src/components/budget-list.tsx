"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { type BudgetFormState, manageBudgets } from "@/app/organizer/budget/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";
import { Toast } from "@/components/toast";
import { useAutoDismiss } from "@/components/use-auto-dismiss";

const initialState: BudgetFormState = {};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type Budget = {
  id: string;
  name: string;
  isActive: boolean;
  totalCents: number;
  createdAt: string;
  basedOnName: string | null;
};

const ACTIVATE_FORM_ID = "activate-budget-form";
const DELETE_FORM_ID = "delete-budget-form";

export function BudgetList({ budgets }: { budgets: Budget[] }) {
  const [createState, createAction, creating] = useActionState(
    manageBudgets,
    initialState,
  );
  const [activateState, activateAction, activating] = useActionState(
    manageBudgets,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    manageBudgets,
    initialState,
  );
  const showCreateMessage = useAutoDismiss(createState);
  const showActivateMessage = useAutoDismiss(activateState);
  const showDeleteMessage = useAutoDismiss(deleteState);
  const results = [
    { state: activateState, show: showActivateMessage },
    { state: deleteState, show: showDeleteMessage },
  ].filter((result) => result.show);
  const manageError = results.find((result) => result.state.error)?.state
    .error;
  const manageSuccess = !manageError && results.some((r) => r.state.success);
  const [mode, setMode] = useState<"scratch" | "duplicate">("scratch");
  const managing = activating || deleting;

  return (
    <div className="space-y-6">
      <section className="dashboard-card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Create a new budget
        </h2>
        <form action={createAction} className="space-y-4">
          <FormPendingOverlay />
          <input type="hidden" name="operation" value="createBudget" />
          <label className="field">
            <span>Budget name</span>
            <input name="name" placeholder="e.g. 2026 draft" required />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mode"
                value="scratch"
                checked={mode === "scratch"}
                onChange={() => setMode("scratch")}
              />
              Start from 0
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mode"
                value="duplicate"
                checked={mode === "duplicate"}
                onChange={() => setMode("duplicate")}
                disabled={budgets.length === 0}
              />
              Review an existing budget
            </label>
          </div>

          {mode === "duplicate" && (
            <label className="field">
              <span>Base this budget on</span>
              <select name="sourceBudgetId" required>
                {budgets.map((budget) => (
                  <option key={budget.id} value={budget.id}>
                    {budget.name}
                    {budget.isActive ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {showCreateMessage && createState.error && (
            <Toast kind="error">{createState.error}</Toast>
          )}
          {showCreateMessage && createState.success && (
            <Toast kind="success">Budget created.</Toast>
          )}

          <button className="primary-button" disabled={creating}>
            {creating ? "Creating..." : "Create budget"}
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Budgets</h2>

        {budgets.length === 0 && (
          <p className="text-sm text-slate-500">No budgets yet.</p>
        )}

        <div className="space-y-3">
          {budgets.map((budget) => (
            <div
              key={budget.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
                budget.isActive
                  ? "border-violet-300 bg-violet-50/60"
                  : "border-slate-200"
              }`}
            >
              <div>
                <p className="font-medium text-slate-900">
                  {budget.name}{" "}
                  {budget.isActive && (
                    <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                      Active
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {currency.format(budget.totalCents / 100)}
                  {budget.basedOnName ? ` · based on ${budget.basedOnName}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/organizer/budget/${budget.id}`}
                  className="secondary-button"
                >
                  Edit
                </Link>
                {!budget.isActive && (
                  <button
                    type="submit"
                    form={ACTIVATE_FORM_ID}
                    name="id"
                    value={budget.id}
                    className="secondary-button"
                    disabled={managing}
                  >
                    Activate
                  </button>
                )}
                {!budget.isActive && (
                  <button
                    type="submit"
                    form={DELETE_FORM_ID}
                    name="id"
                    value={budget.id}
                    className="flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                    disabled={managing}
                    onClick={(event) => {
                      if (!window.confirm(`Delete the "${budget.name}" budget?`)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {(manageError || manageSuccess) && (
          <div className="mt-4">
            {manageError && <Toast kind="error">{manageError}</Toast>}
            {manageSuccess && <Toast kind="success">Done.</Toast>}
          </div>
        )}

        <form
          id={ACTIVATE_FORM_ID}
          action={activateAction}
          className="contents"
        >
          <FormPendingOverlay label="Activating…" />
          <input type="hidden" name="operation" value="activateBudget" />
        </form>
        <form id={DELETE_FORM_ID} action={deleteAction} className="contents">
          <FormPendingOverlay label="Deleting…" />
          <input type="hidden" name="operation" value="deleteBudget" />
        </form>
      </section>
    </div>
  );
}
