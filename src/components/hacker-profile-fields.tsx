"use client";

import { useState, useTransition } from "react";
import { checkExistingAccount } from "@/app/actions/auth";

export type CheckState = "idle" | "found" | "not-found";

const GENDER_OPTIONS = [
  { value: "WOMAN", label: "Woman" },
  { value: "MAN", label: "Man" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

const DIET_OPTIONS = [
  { value: "OMNIVORE", label: "Omnivore" },
  { value: "VEGETARIAN", label: "Vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "GLUTEN_FREE", label: "Gluten-free" },
  { value: "HALAL", label: "Halal" },
  { value: "KOSHER", label: "Kosher" },
  { value: "OTHER", label: "Other" },
] as const;

const TSHIRT_SIZE_OPTIONS = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
] as const;

/** Shared profile fields (name/email/password/gender/diet/t-shirt size) used by
 * both the hackathon registration form (for the admin) and the hacker
 * invite registration form.
 *
 * Every field besides email starts disabled — you have to "Check email"
 * first. From there:
 * - Account found: the fields get filled in from that account and stay
 *   locked (nothing to edit, including the password — there's no real
 *   password to show and nothing new to prove), and submitting just adds
 *   the new hackathon/invite to that existing account.
 * - No account found: every field unlocks so a brand new profile (with a
 *   new password) can be filled in and created.
 * Either way, submitting is only allowed once a check has happened — see
 * `onCheckStateChange`. */
export function HackerProfileFields({
  onCheckStateChange,
}: {
  onCheckStateChange?: (state: CheckState) => void;
}) {
  const [email, setEmail] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [diet, setDiet] = useState("");
  const [tshirtSize, setTshirtSize] = useState("");

  const locked = checkState === "found";
  const fieldsDisabled = checkState === "idle" || checking;

  function updateCheckState(next: CheckState) {
    setCheckState(next);
    onCheckStateChange?.(next);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    if (checkState !== "idle") {
      updateCheckState("idle");
      setName("");
      setGender("");
      setDiet("");
      setTshirtSize("");
    }
    setCheckMessage(null);
  }

  function handleCheckEmail() {
    setCheckMessage(null);
    startChecking(async () => {
      const result = await checkExistingAccount(email);

      if (result.exists) {
        setName(result.name ?? "");
        setGender(result.gender ?? "");
        setDiet(result.diet ?? "");
        setTshirtSize(result.tshirtSize ?? "");
        updateCheckState("found");
        setCheckMessage(
          `Welcome back${result.name ? `, ${result.name}` : ""} — this will add the hackathon to your existing account.`,
        );
      } else {
        setName("");
        setGender("");
        setDiet("");
        setTshirtSize("");
        updateCheckState("not-found");
        setCheckMessage(
          "No account found with that email — fill in the fields below to create one.",
        );
      }
    });
  }

  return (
    <>
      <label className="field">
        <span>Email</span>
        <div className="flex gap-2">
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
            required
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleCheckEmail}
            disabled={checking || !email}
            className="secondary-button shrink-0 px-4 text-sm"
          >
            {checking ? "Checking..." : "Check email"}
          </button>
        </div>
      </label>

      {checkMessage && (
        <p
          className={`-mt-2 text-sm ${
            checkState === "found" ? "text-emerald-600" : "text-slate-500"
          }`}
        >
          {checkMessage}
        </p>
      )}

      {locked && <input type="hidden" name="verifiedEmail" value={email} />}

      <label className="field">
        <span>Complete name</span>
        <input
          name={locked ? undefined : "name"}
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={name}
          onChange={(event) => setName(event.target.value)}
          readOnly={locked}
          disabled={fieldsDisabled}
          required={!locked}
        />
        {locked && <input type="hidden" name="name" value={name} />}
      </label>

      <label className="field">
        <span>Password</span>
        <input
          name={locked ? undefined : "password"}
          type="password"
          autoComplete={locked ? undefined : "new-password"}
          placeholder={
            locked
              ? "Not needed — using your existing account"
              : "At least 8 characters"
          }
          minLength={8}
          disabled={fieldsDisabled || locked}
          required={!locked && checkState === "not-found"}
        />
      </label>

      <label className="field">
        <span>Gender</span>
        <select
          name={locked ? undefined : "gender"}
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          disabled={fieldsDisabled || locked}
          required={!locked}
        >
          <option value="" disabled>
            Select your gender
          </option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {locked && <input type="hidden" name="gender" value={gender} />}
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <span>Diet</span>
          <select
            name={locked ? undefined : "diet"}
            value={diet}
            onChange={(event) => setDiet(event.target.value)}
            disabled={fieldsDisabled || locked}
            required={!locked}
          >
            <option value="" disabled>
              Select your diet
            </option>
            {DIET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {locked && <input type="hidden" name="diet" value={diet} />}
        </label>
        <label className="field">
          <span>T-shirt size</span>
          <select
            name={locked ? undefined : "tshirtSize"}
            value={tshirtSize}
            onChange={(event) => setTshirtSize(event.target.value)}
            disabled={fieldsDisabled || locked}
            required={!locked}
          >
            <option value="" disabled>
              Select your size
            </option>
            {TSHIRT_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {locked && (
            <input type="hidden" name="tshirtSize" value={tshirtSize} />
          )}
        </label>
      </div>
    </>
  );
}
