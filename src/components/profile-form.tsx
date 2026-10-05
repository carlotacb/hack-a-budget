"use client";

import type { Diet, Gender, TShirtSize } from "@prisma/client";
import { useActionState, useState } from "react";
import {
  type ProfileFormState,
  updateProfile,
} from "@/app/profile/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";

const initialState: ProfileFormState = {};

type ProfileFormProps = {
  user: {
    name: string | null;
    email: string;
    gender: Gender | null;
    diet: Diet | null;
    tshirtSize: TShirtSize | null;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  const [name, setName] = useState(user.name ?? "");

  return (
    <form action={formAction} className="space-y-5">
<FormPendingOverlay />
      <label className="field">
        <span>Complete name</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>

      <div className="field">
        <span>Email</span>
        <p
          className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600"
          aria-describedby="email-help"
        >
          {user.email}
        </p>
        <small id="email-help" className="text-xs text-slate-500">
          Email cannot be changed from your profile.
        </small>
      </div>

      <label className="field">
        <span>Gender</span>
        <select
          key={user.gender}
          name="gender"
          defaultValue={user.gender ?? ""}
          required
        >
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
          <span>Diet</span>
          <select key={user.diet} name="diet" defaultValue={user.diet ?? ""} required>
            <option value="" disabled>
              Select your diet
            </option>
            <option value="OMNIVORE">Omnivore</option>
            <option value="VEGETARIAN">Vegetarian</option>
            <option value="VEGAN">Vegan</option>
            <option value="GLUTEN_FREE">Gluten-free</option>
            <option value="HALAL">Halal</option>
            <option value="KOSHER">Kosher</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="field">
          <span>T-shirt size</span>
          <select
            key={user.tshirtSize}
            name="tshirtSize"
            defaultValue={user.tshirtSize ?? ""}
            required
          >
            <option value="" disabled>
              Select your size
            </option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="XXL">XXL</option>
          </select>
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
