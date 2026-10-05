"use client";

import { Copy, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import {
  createHackerInvite,
  revokeHackerInvite,
  type InviteActionState,
} from "@/app/organizer/users/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";

const initialState: InviteActionState = {};

type Invite = {
  id: string;
  token: string;
  createdAt: Date;
};

export function InviteLinksPanel({ invites }: { invites: Invite[] }) {
  const [createState, createAction, creating] = useActionState(
    createHackerInvite,
    initialState,
  );

  return (
    <section className="dashboard-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Hacker onboarding</p>
          <h2 className="mt-1 text-xl font-semibold">Invite links</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Each link is single-use: share one per hacker, it stops working
            once they finish registering.
          </p>
        </div>
        <form action={createAction}>
          <FormPendingOverlay label="Creating invite…" />
          <button
            className="primary-button !h-10 !px-4 text-sm"
            disabled={creating}
          >
            {creating ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={16} aria-hidden="true" />
            )}
            Generate invite
          </button>
        </form>
      </div>

      {createState.error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {createState.error}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {invites.length === 0 ? (
          <p className="text-sm text-slate-500">
            No open invites. Generate one to let a hacker register.
          </p>
        ) : (
          invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} />
          ))
        )}
      </div>
    </section>
  );
}

function InviteRow({ invite }: { invite: Invite }) {
  const [copied, setCopied] = useState(false);
  const [, revokeAction, revoking] = useActionState(
    async (_state: InviteActionState) => revokeHackerInvite(invite.id),
    initialState,
  );

  async function handleCopy() {
    const url = `${window.location.origin}/invite/${invite.token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
        <Link2 size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span className="truncate font-mono text-xs">/invite/{invite.token}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
          aria-label="Copy invite link"
        >
          <Copy size={16} aria-hidden="true" />
        </button>
        <form action={revokeAction}>
          <FormPendingOverlay label="Revoking…" />
          <button
            type="submit"
            disabled={revoking}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
            aria-label="Revoke invite link"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </form>
        {copied && (
          <span className="text-xs font-medium text-emerald-600">
            Copied!
          </span>
        )}
      </div>
    </div>
  );
}
