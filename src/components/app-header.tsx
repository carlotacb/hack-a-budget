"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { UserRound } from "lucide-react";
import {
  HackathonSwitcher,
  type HackathonSwitcherProps,
} from "@/components/hackathon-switcher";

type AppHeaderProps = {
  name?: string | null;
  // A hackathon's role labels are configurable (renamed/activated per
  // event), so this is just the display label, not a fixed enum.
  role?: string;
  hackathons?: HackathonSwitcherProps["options"];
  activeHackathonId?: string;
};

export function AppHeader({
  name,
  role,
  hackathons,
  activeHackathonId,
}: AppHeaderProps) {
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
          {hackathons && activeHackathonId && (
            <HackathonSwitcher
              options={hackathons}
              activeHackathonId={activeHackathonId}
            />
          )}
          {role && (
            <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              {role}
            </span>
          )}
          <Link
            href="/profile"
            className="secondary-button !h-10 !px-3 text-sm"
            aria-label="Edit profile"
          >
            <UserRound size={17} />
            <span className="hidden md:inline">Profile</span>
          </Link>
          {name && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{name}</p>
            </div>
          )}
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
