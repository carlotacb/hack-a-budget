"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 font-semibold">
          <span className="brand-mark brand-mark-small">B</span>
          BudgetHack
        </div>

        {/* Desktop: links shown inline. */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/login" className="nav-link">
            Sign in
          </Link>
          <Link href="/register" className="primary-button !h-10 !px-5 text-sm">
            Join as a hacker
          </Link>
        </div>

        {/* Phone: links hidden behind a hamburger menu. */}
        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-900/5 sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:hidden">
          <Link
            href="/login"
            className="nav-link"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="primary-button !h-10 w-full !px-5 text-sm"
            onClick={() => setOpen(false)}
          >
            Join as a hacker
          </Link>
        </div>
      )}
    </nav>
  );
}
