"use client";

import { useActionState, useRef } from "react";
import {
  finalApproveTravel,
  reviewTravelRequest,
  saveRequirementChecks,
  type TravelReviewState,
} from "@/app/organizer/travel-reimbursements/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";

const initialState: TravelReviewState = {};

type MessageTemplate = {
  id: string;
  name: string;
  message: string;
};

export function TravelReviewForm({
  reimbursementId,
  submittedTotal,
  currencyCode,
  messageTemplates = [],
}: {
  reimbursementId: string;
  submittedTotal: string;
  currencyCode: string;
  messageTemplates?: MessageTemplate[];
}) {
  const action = reviewTravelRequest.bind(null, reimbursementId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  function applyTemplate(event: React.ChangeEvent<HTMLSelectElement>) {
    const message = event.target.value;
    if (message && noteRef.current) {
      noteRef.current.value = message;
    }
    event.target.value = "";
  }

  return (
    <form action={formAction} className="space-y-4">
<FormPendingOverlay />
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
        {messageTemplates.length > 0 && (
          <label className="field">
            <span>Message template</span>
            <select defaultValue="" onChange={applyTemplate}>
              <option value="">Apply a template…</option>
              {messageTemplates.map((template) => (
                <option key={template.id} value={template.message}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field sm:col-span-2">
          <span>Reviewer note</span>
          <textarea
            ref={noteRef}
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
<FormPendingOverlay />
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
<FormPendingOverlay />
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
