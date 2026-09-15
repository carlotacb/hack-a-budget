"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { UserRound } from "lucide-react";

type AppHeaderProps = {
  name?: string | null;
  role: "Hacker" | "Organizer";
};

export function AppHeader({ name, role }: AppHeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(false);

    try {
      await signOut({ redirectTo: "/" });
    } catch {
      setIsSigningOut(false);
      setSignOutError(true);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
          <span className="brand-mark brand-mark-small">B</span>
          <span className="tracking-[-0.02em]">BudgetHack</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="secondary-button !h-10 !px-3 text-sm"
            aria-label="Edit profile"
          >
            <UserRound size={17} />
            <span className="hidden md:inline">Profile</span>
          </Link>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-800">
              {name ?? "Participant"}
            </p>
            <p className="text-xs text-slate-500">{role}</p>
          </div>
          <div className="text-right">
            <button
              type="button"
              className="secondary-button !h-10 !px-4 text-sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
            {signOutError && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                Sign out failed. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
