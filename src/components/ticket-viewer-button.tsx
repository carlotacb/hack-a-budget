"use client";

import { X } from "lucide-react";
import { useState } from "react";

export function TicketViewerButton({ ticketPath }: { ticketPath: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="secondary-button mt-6" onClick={() => setOpen(true)}>
        Open ticket document
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-viewer-title"
        >
          <div className="flex w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 id="ticket-viewer-title" className="text-sm font-semibold text-slate-900">
                Ticket document
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close ticket viewer"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="p-4">
              <iframe
                src={ticketPath}
                title="Ticket document preview"
                className="h-[75vh] w-full rounded-xl border border-slate-200"
              />
              <a
                href={ticketPath}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline"
              >
                Open in a new tab if preview does not load
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

