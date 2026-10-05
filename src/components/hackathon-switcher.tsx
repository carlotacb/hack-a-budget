"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { switchActiveHackathon } from "@/app/actions/hackathon";
import { roleLabels } from "@/lib/roles";
import type { HackathonOption } from "@/lib/current-hackathon";

export type HackathonSwitcherProps = {
  options: HackathonOption[];
  activeHackathonId: string;
};

/** Dropdown next to the profile button letting a user who belongs to
 * several hackathons switch which one is active. Hidden entirely for
 * users with only one membership. */
export function HackathonSwitcher({
  options,
  activeHackathonId,
}: HackathonSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (options.length <= 1) {
    return null;
  }

  const active = options.find(
    (option) => option.hackathonId === activeHackathonId,
  );

  function handleSelect(hackathonId: string) {
    setIsOpen(false);
    if (hackathonId === activeHackathonId) return;
    startTransition(() => {
      switchActiveHackathon(hackathonId);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="secondary-button !h-10 !px-3 text-sm"
        onClick={() => setIsOpen((value) => !value)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="max-w-[9rem] truncate">
          {isPending
            ? "Switching..."
            : (active?.hackathonName ?? "Select hackathon")}
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close hackathon menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {options.map((option) => (
              <li key={option.hackathonId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.hackathonId === activeHackathonId}
                  onClick={() => handleSelect(option.hackathonId)}
                  className={`flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
                    option.hackathonId === activeHackathonId
                      ? "bg-violet-50"
                      : ""
                  }`}
                >
                  <span className="font-medium text-slate-900">
                    {option.hackathonName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {roleLabels[option.role]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
