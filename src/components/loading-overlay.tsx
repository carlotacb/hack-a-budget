"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function LoadingOverlay({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="loading-overlay fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
      role="progressbar"
      aria-label={label}
      aria-busy="true"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-2xl">
        <Loader2
          size={22}
          className="animate-spin text-violet-600"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-slate-800">{label}</span>
      </div>
    </div>
  );
}

/** Drop inside a <form>: shows the overlay while that form's action runs. */
export function FormPendingOverlay({ label = "Saving…" }: { label?: string }) {
  const { pending } = useFormStatus();

  return pending ? <LoadingOverlay label={label} /> : null;
}
