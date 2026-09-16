"use client";

import { useActionState, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import {
  saveTravelRequest,
  type TravelFormState,
} from "@/app/hacker/travel-actions";

const initialState: TravelFormState = {};

export type TravelFormValues = {
  originCity: string;
  originCountry: string;
  transportMode: "BUS" | "TRAIN" | "AIRPLANE";
  outboundDepartureAt: string;
  outboundDeparturePlace: string;
  outboundArrivalAt: string;
  outboundArrivalPlace: string;
  outboundCarrier: string;
  outboundServiceNumber: string;
  returnDepartureAt: string;
  returnDeparturePlace: string;
  returnArrivalAt: string;
  returnArrivalPlace: string;
  returnCarrier: string;
  returnServiceNumber: string;
  totalPrice: string;
  luggagePaid: boolean;
  luggagePrice: string;
  ticketPath?: string;
};

export function TravelReimbursementForm({
  values,
  isResubmission,
}: {
  values: TravelFormValues;
  isResubmission: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveTravelRequest,
    initialState,
  );
  const [transportMode, setTransportMode] = useState(values.transportMode);
  const [luggagePaid, setLuggagePaid] = useState(values.luggagePaid);
  const [ticketName, setTicketName] = useState("");
  const serviceLabel =
    transportMode === "AIRPLANE" ? "Flight number" : "Service number";

  return (
    <form action={formAction} className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <span>Origin city</span>
          <input name="originCity" defaultValue={values.originCity} required />
        </label>
        <label className="field">
          <span>Origin country</span>
          <input
            name="originCountry"
            defaultValue={values.originCountry}
            required
          />
        </label>
        <label className="field sm:col-span-2">
          <span>Transport mode</span>
          <select
            name="transportMode"
            value={transportMode}
            onChange={(event) =>
              setTransportMode(
                event.target.value as TravelFormValues["transportMode"],
              )
            }
            required
          >
            <option value="BUS">Bus</option>
            <option value="TRAIN">Train</option>
            <option value="AIRPLANE">Airplane</option>
          </select>
        </label>
      </div>

      <JourneyFields
        prefix="outbound"
        title="Outbound journey"
        values={values}
        serviceLabel={serviceLabel}
      />
      <JourneyFields
        prefix="return"
        title="Return journey"
        values={values}
        serviceLabel={serviceLabel}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <span>Total travel price (EUR)</span>
          <input
            name="totalPrice"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={values.totalPrice}
            required
          />
        </label>
        <div className="space-y-3">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
            <input
              name="luggagePaid"
              type="checkbox"
              checked={luggagePaid}
              onChange={(event) => setLuggagePaid(event.target.checked)}
            />
            I paid separately for luggage
          </label>
          {luggagePaid && (
            <label className="field">
              <span>Luggage price (EUR)</span>
              <input
                name="luggagePrice"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={values.luggagePrice}
                required
              />
            </label>
          )}
        </div>
        <label className="field sm:col-span-2">
          <span>Ticket document</span>
          <span className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-600 hover:border-violet-400">
            <Paperclip size={17} aria-hidden="true" />
            {ticketName ||
              (values.ticketPath
                ? "Replace current ticket (optional)"
                : "Upload one PDF, JPG, PNG, or WebP (max 5 MB)")}
            <input
              name="ticket"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              required={!values.ticketPath}
              onChange={(event) =>
                setTicketName(event.target.files?.[0]?.name ?? "")
              }
            />
          </span>
          {values.ticketPath && (
            <a
              href={values.ticketPath}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-violet-700 hover:underline"
            >
              View current ticket
            </a>
          )}
        </label>
      </div>

      <FormResult state={state} success="Travel request submitted." />
      <button className="primary-button w-full" disabled={pending}>
        <Send size={17} aria-hidden="true" />
        {pending
          ? "Submitting..."
          : isResubmission
            ? "Update and resubmit"
            : "Submit travel request"}
      </button>
    </form>
  );
}

function JourneyFields({
  prefix,
  title,
  values,
  serviceLabel,
}: {
  prefix: "outbound" | "return";
  title: string;
  values: TravelFormValues;
  serviceLabel: string;
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 p-5">
      <legend className="px-2 font-semibold text-slate-900">{title}</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <span>Departure date and time</span>
          <input
            name={`${prefix}DepartureAt`}
            type="datetime-local"
            defaultValue={values[`${prefix}DepartureAt`]}
            required
          />
        </label>
        <label className="field">
          <span>Departure airport or station</span>
          <input
            name={`${prefix}DeparturePlace`}
            defaultValue={values[`${prefix}DeparturePlace`]}
            required
          />
        </label>
        <label className="field">
          <span>Arrival date and time</span>
          <input
            name={`${prefix}ArrivalAt`}
            type="datetime-local"
            defaultValue={values[`${prefix}ArrivalAt`]}
            required
          />
        </label>
        <label className="field">
          <span>Arrival airport or station</span>
          <input
            name={`${prefix}ArrivalPlace`}
            defaultValue={values[`${prefix}ArrivalPlace`]}
            required
          />
        </label>
        <label className="field">
          <span>Carrier or company</span>
          <input
            name={`${prefix}Carrier`}
            defaultValue={values[`${prefix}Carrier`]}
            required
          />
        </label>
        <label className="field">
          <span>{serviceLabel} (optional)</span>
          <input
            name={`${prefix}ServiceNumber`}
            defaultValue={values[`${prefix}ServiceNumber`]}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function FormResult({
  state,
  success,
}: {
  state: TravelFormState;
  success: string;
}) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      >
        {success}
      </p>
    );
  }
  return null;
}
