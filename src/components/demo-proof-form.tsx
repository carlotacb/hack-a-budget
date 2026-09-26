"use client";

import { useActionState, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  saveDemoProof,
  type TravelFormState,
} from "@/app/hacker/travel-actions";
import { FormResult } from "@/components/travel-reimbursement-form";
import { FormPendingOverlay } from "@/components/loading-overlay";

const initialState: TravelFormState = {};

export function DemoProofForm({
  unlocked,
  unlockLabel,
  demoUrl,
  demoComment,
}: {
  unlocked: boolean;
  unlockLabel: string;
  demoUrl: string;
  demoComment: string;
}) {
  const [open, setOpen] = useState(Boolean(demoUrl));
  const [state, formAction, pending] = useActionState(
    saveDemoProof,
    initialState,
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="primary-button"
        disabled={!unlocked}
        onClick={() => setOpen((value) => !value)}
      >
        <ExternalLink size={17} aria-hidden="true" />
        Demo prove
      </button>
      {!unlocked && (
        <p className="text-sm text-slate-600">Unlocks {unlockLabel}.</p>
      )}
      {open && unlocked && (
        <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 p-5">
<FormPendingOverlay />
          <label className="field">
            <span>Project or demo URL</span>
            <input
              name="demoUrl"
              type="url"
              defaultValue={demoUrl}
              placeholder="https://..."
              required
            />
          </label>
          <label className="field">
            <span>Demo room or other comments</span>
            <textarea
              name="demoComment"
              defaultValue={demoComment}
              rows={4}
              placeholder="Demo room, timing, or other useful context"
            />
          </label>
          <FormResult state={state} success="Demo proof saved." />
          <button className="secondary-button" disabled={pending}>
            {pending ? "Saving..." : demoUrl ? "Update demo proof" : "Submit demo proof"}
          </button>
        </form>
      )}
    </div>
  );
}
