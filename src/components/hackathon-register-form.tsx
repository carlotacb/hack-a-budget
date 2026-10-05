"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { registerHackathon, type AuthFormState } from "@/app/actions/auth";
import { FormPendingOverlay } from "@/components/loading-overlay";
import {
  HackerProfileFields,
  type CheckState,
} from "@/components/hacker-profile-fields";
import { RoleSettingsFields } from "@/components/role-settings-fields";
import { TagListField } from "@/components/tag-list-field";

const initialState: AuthFormState = {};

export function HackathonRegisterForm({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    registerHackathon,
    initialState,
  );
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const canSubmit = isAuthenticated || checkState !== "idle";
  const submitLabel =
    !isAuthenticated && checkState === "found"
      ? "Connect account & register hackathon"
      : "Register hackathon";

  return (
    <div className="auth-card auth-card--wide">
      <div className="mb-8">
        <Link href="/" className="brand-mark" aria-label="BudgetHack home">
          B
        </Link>
        <p className="eyebrow mt-7">Register a hackathon</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Register your hackathon
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This creates a brand new, isolated hackathon workspace with its own
          budget, expenses, travel flow and metadata.
          {isAuthenticated
            ? " You'll be its admin, alongside any hackathons you already belong to."
            : " Hackers join later through invite links from the Users tab."}
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <FormPendingOverlay />

        <label className="field">
          <span>Hackathon name</span>
          <input
            name="hackathonName"
            type="text"
            placeholder="BudgetHack 2026"
            required
          />
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <input
            name="travelReimbursementEnabled"
            type="checkbox"
            defaultChecked
            className="h-4 w-4"
          />
          <span>
            Enable the travel reimbursement flow
            <span className="block text-xs text-slate-500">
              You can turn this on or off later from event settings.
            </span>
          </span>
        </label>

        <TagListField
          name="departments"
          label="Initial departments (optional)"
          placeholder="e.g. Design"
        />

        <TagListField
          name="categories"
          label="Initial categories (optional)"
          placeholder="e.g. Catering"
        />

        <div className="border-t border-slate-200 pt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Roles &amp; permissions
          </p>
          <p className="mb-5 text-xs text-slate-500">
            Activate the roles this hackathon needs, rename them if you
            like, and choose what each one can do. You can change all of
            this later from event settings.
          </p>
          <RoleSettingsFields />
        </div>

        {!isAuthenticated && (
          <div className="border-t border-slate-200 pt-5">
            <p className="mb-5 text-sm font-semibold text-slate-700">
              Your admin account
            </p>
            <div className="space-y-5">
              <HackerProfileFields onCheckStateChange={setCheckState} />
            </div>
          </div>
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
