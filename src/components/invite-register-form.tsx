"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { registerWithInvite, type AuthFormState } from "@/app/actions/auth";
import { FormPendingOverlay } from "@/components/loading-overlay";
import {
  HackerProfileFields,
  type CheckState,
} from "@/components/hacker-profile-fields";

const initialState: AuthFormState = {};

export function InviteRegisterForm({
  token,
  hackathonName,
  isAuthenticated = false,
}: {
  token: string;
  hackathonName: string;
  isAuthenticated?: boolean;
}) {
  const action = registerWithInvite.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const canSubmit = isAuthenticated || checkState !== "idle";
  const submitLabel = isAuthenticated
    ? "Join hackathon"
    : checkState === "found"
      ? "Connect account"
      : "Create account";

  return (
    <div className="auth-card">
      <div className="mb-8">
        <Link href="/" className="brand-mark" aria-label="BudgetHack home">
          B
        </Link>
        <p className="eyebrow mt-7">Join the event</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {isAuthenticated ? `Join ${hackathonName}` : "Create your account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {isAuthenticated
            ? `You're signed in — join ${hackathonName} as a hacker with your existing account.`
            : `Create your hacker profile to join ${hackathonName}.`}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <FormPendingOverlay />
        {!isAuthenticated && (
          <HackerProfileFields onCheckStateChange={setCheckState} />
        )}

        {state.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {state.success && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {state.success}
          </p>
        )}

        <button
          className="primary-button w-full"
          disabled={pending || !canSubmit}
        >
          {pending ? "Please wait..." : submitLabel}
        </button>
      </form>

      {!isAuthenticated && (
        <p className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            className="font-semibold text-violet-700 hover:text-violet-900"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
