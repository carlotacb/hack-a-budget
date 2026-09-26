"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  type AuthFormState,
  login,
  loginWithGoogle,
  register,
} from "@/app/actions/auth";
import { FormPendingOverlay } from "@/components/loading-overlay";

const initialState: AuthFormState = {};

type AuthFormProps = {
  mode: "login" | "register";
  googleEnabled: boolean;
};

export function AuthForm({ mode, googleEnabled }: AuthFormProps) {
  const isRegister = mode === "register";
  const action = isRegister ? register : login;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="auth-card">
      <div className="mb-8">
        <Link href="/" className="brand-mark" aria-label="BudgetHack home">
          B
        </Link>
        <p className="eyebrow mt-7">
          {isRegister ? "Join the event" : "Welcome back"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {isRegister ? "Create your account" : "Sign in to BudgetHack"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {isRegister
            ? "Create your hacker profile to join the event."
            : "Access your hackathon workspace and keep building."}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
<FormPendingOverlay />
        {isRegister && (
          <label className="field">
            <span>Complete name</span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Ada Lovelace"
              required
            />
          </label>
        )}

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
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </label>

        {isRegister && (
          <>
            <label className="field">
              <span>Gender</span>
              <select name="gender" defaultValue="" required>
                <option value="" disabled>
                  Select your gender
                </option>
                <option value="WOMAN">Woman</option>
                <option value="MAN">Man</option>
                <option value="NON_BINARY">Non-binary</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="field">
                <span>City</span>
                <input
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Madrid"
                  required
                />
              </label>
              <label className="field">
                <span>Major</span>
                <input
                  name="major"
                  type="text"
                  placeholder="Computer Science"
                  required
                />
              </label>
            </div>
          </>
        )}

        {state.error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button className="primary-button w-full" disabled={pending}>
          {pending
            ? "Please wait..."
            : isRegister
              ? "Create account"
              : "Sign in"}
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

      <p className="mt-7 text-center text-sm text-slate-500">
        {isRegister ? "Already have an account?" : "New to BudgetHack?"}{" "}
        <Link
          className="font-semibold text-violet-700 hover:text-violet-900"
          href={isRegister ? "/login" : "/register"}
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
