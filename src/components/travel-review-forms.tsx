"use client";

import { useActionState } from "react";
import {
  finalApproveTravel,
  reviewTravelRequest,
  saveRequirementChecks,
  type TravelReviewState,
} from "@/app/organizer/travel-reimbursements/actions";

const initialState: TravelReviewState = {};

export function TravelReviewForm({
  reimbursementId,
  submittedTotal,
  currencyCode,
}: {
  reimbursementId: string;
  submittedTotal: string;
  currencyCode: string;
}) {
  const action = reviewTravelRequest.bind(null, reimbursementId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Approved reimbursement ({currencyCode})</span>
          <input
            name="approvedAmount"
            type="number"
            min="0"
            step="0.01"
            max={submittedTotal}
            defaultValue={submittedTotal}
          />
        </label>
        <label className="field sm:col-span-2">
          <span>Reviewer note</span>
          <textarea
            name="note"
            rows={4}
            placeholder="Required for changes or rejection; optional for approval"
          />
        </label>
      </div>
      <ActionResult state={state} success="Review saved." />
      <div className="flex flex-wrap gap-2">
        <button
          className="primary-button"
          name="operation"
          value="approve"
          disabled={pending}
        >
          Approve travel
        </button>
        <button
          className="secondary-button"
          name="operation"
          value="requestChanges"
          disabled={pending}
        >
          Request changes
        </button>
        <button
          className="secondary-button !border-red-200 !text-red-700"
          name="operation"
          value="reject"
          disabled={pending}
        >
          Reject
        </button>
      </div>
    </form>
  );
}

export function FinalRequirementForms({
  reimbursementId,
  requirements,
}: {
  reimbursementId: string;
  requirements: { id: string; name: string; checked: boolean }[];
}) {
  const checklistAction = saveRequirementChecks.bind(null, reimbursementId);
  const finalAction = finalApproveTravel.bind(null, reimbursementId);
  const [checkState, checkFormAction, checking] = useActionState(
    checklistAction,
    initialState,
  );
  const [finalState, finalFormAction, approving] = useActionState(
    finalAction,
    initialState,
  );

  return (
    <div className="space-y-5">
      <form action={checkFormAction} className="space-y-4">
        {requirements.length ? (
          requirements.map((requirement) => (
            <label
              key={requirement.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
            >
              <input
                name={`requirement:${requirement.id}`}
                type="checkbox"
                defaultChecked={requirement.checked}
                className="mt-1"
              />
              <span className="text-sm font-medium text-slate-800">
                {requirement.name}
              </span>
            </label>
          ))
        ) : (
          <p className="text-sm text-slate-600">
            No active final requirements are configured.
          </p>
        )}
        <ActionResult state={checkState} success="Checklist saved." />
        <button className="secondary-button" disabled={checking}>
          {checking ? "Saving..." : "Save checklist"}
        </button>
      </form>
      <form action={finalFormAction}>
        <ActionResult state={finalState} success="Final approval recorded." />
        <button className="primary-button mt-3" disabled={approving}>
          {approving ? "Approving..." : "Final approve"}
        </button>
      </form>
    </div>
  );
}

function ActionResult({
  state,
  success,
}: {
  state: TravelReviewState;
  success: string;
}) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-sm text-emerald-600">
        {success}
      </p>
    );
  }
  return null;
}
