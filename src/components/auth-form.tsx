"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, loginWithGoogle, type AuthFormState } from "@/app/actions/auth";
import { FormPendingOverlay } from "@/components/loading-overlay";

const initialState: AuthFormState = {};

export function AuthForm({
  googleEnabled,
  infoMessage,
}: {
  googleEnabled: boolean;
  infoMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="auth-card">
      <div className="mb-8">
        <Link href="/" className="brand-mark" aria-label="BudgetHack home">
          B
        </Link>
        <p className="eyebrow mt-7">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Sign in to BudgetHack
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Access your hackathon workspace and keep building.
        </p>
      </div>

      {infoMessage && (
        <p className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </p>
      )}

      <form action={formAction} className="space-y-5">
        <FormPendingOverlay />
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </label>

        {state.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button className="primary-button w-full" disabled={pending}>
          {pending ? "Please wait..." : "Sign in"}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <form action={loginWithGoogle}>
            <FormPendingOverlay />
            <button className="secondary-button w-full">
              Continue with Google
            </button>
          </form>
        </>
      )}
    </div>
  );
}
