"use client";

import { useActionState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";

const initialState: MetadataFormState = {};

export function TravelSettingsForm({
  hackathonStartAt,
  reimbursementInstructions,
  finalReviewInstructions,
}: {
  hackathonStartAt: string;
  reimbursementInstructions: string;
  finalReviewInstructions: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="operation" value="updateTravelSettings" />
      <label className="field">
        <span>Hackathon start (event local time)</span>
        <input
          name="hackathonStartAt"
          type="datetime-local"
          defaultValue={hackathonStartAt}
        />
      </label>
      <label className="field">
        <span>Instructions shown after travel approval</span>
        <textarea
          name="reimbursementInstructions"
          defaultValue={reimbursementInstructions}
          rows={5}
          required
        />
      </label>
      <label className="field">
        <span>Instructions shown during final review</span>
        <textarea
          name="finalReviewInstructions"
          defaultValue={finalReviewInstructions}
          rows={5}
          required
        />
      </label>
      <FormResult state={state} />
      <button className="primary-button" disabled={pending}>
        {pending ? "Saving..." : "Save travel settings"}
      </button>
    </form>
  );
}

export function TravelRequirementForm({
  id,
  name = "",
  active = true,
}: {
  id?: string;
  name?: string;
  active?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );
  const isCreate = !id;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input
        type="hidden"
        name="operation"
        value={
          isCreate
            ? "createTravelRequirement"
            : "updateTravelRequirement"
        }
      />
      {id && <input type="hidden" name="id" value={id} />}
      <label className="field min-w-48 flex-1">
        <span>{isCreate ? "New requirement" : "Requirement"}</span>
        <input name="name" defaultValue={name} required />
      </label>
      {!isCreate && (
        <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
          <input name="active" type="checkbox" defaultChecked={active} />
          Active
        </label>
      )}
      <button className="secondary-button" disabled={pending}>
        {pending ? "Saving..." : isCreate ? "Add" : "Save"}
      </button>
      <div className="w-full">
        <FormResult state={state} />
      </div>
    </form>
  );
}

export function TravelMessageTemplateForm({
  id,
  name = "",
  message = "",
  active = true,
}: {
  id?: string;
  name?: string;
  message?: string;
  active?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );
  const isCreate = !id;

  return (
    <form action={formAction} className="space-y-2">
      <input
        type="hidden"
        name="operation"
        value={
          isCreate
            ? "createTravelMessageTemplate"
            : "updateTravelMessageTemplate"
        }
      />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="flex flex-wrap items-end gap-2">
        <label className="field min-w-48 flex-1">
          <span>{isCreate ? "New template name" : "Template name"}</span>
          <input name="name" defaultValue={name} required />
        </label>
        {!isCreate && (
          <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
            <input name="active" type="checkbox" defaultChecked={active} />
            Active
          </label>
        )}
        <button className="secondary-button" disabled={pending}>
          {pending ? "Saving..." : isCreate ? "Add" : "Save"}
        </button>
      </div>
      <label className="field">
        <span>Message</span>
        <textarea name="message" defaultValue={message} rows={3} required />
      </label>
      <FormResult state={state} />
    </form>
  );
}

function FormResult({ state }: { state: MetadataFormState }) {
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
        Saved.
      </p>
    );
  }
  return null;
}
