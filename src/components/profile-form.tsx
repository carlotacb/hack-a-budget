"use client";

import type { Gender } from "@prisma/client";
import { useActionState } from "react";
import {
  type ProfileFormState,
  updateProfile,
} from "@/app/profile/actions";

const initialState: ProfileFormState = {};

type ProfileFormProps = {
  user: {
    name: string | null;
    email: string;
    gender: Gender | null;
    city: string | null;
    major: string | null;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className="field">
        <span>Complete name</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={user.name ?? ""}
          required
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={user.email}
          disabled
          aria-describedby="email-help"
        />
        <small id="email-help" className="text-xs text-slate-500">
          Email cannot be changed from your profile.
        </small>
      </label>

      <label className="field">
        <span>Gender</span>
        <select name="gender" defaultValue={user.gender ?? ""} required>
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
            defaultValue={user.city ?? ""}
            required
          />
        </label>
        <label className="field">
          <span>Major</span>
          <input
            name="major"
            type="text"
            defaultValue={user.major ?? ""}
            required
          />
        </label>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Your profile has been updated.
        </p>
      )}

      <button className="primary-button w-full" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
