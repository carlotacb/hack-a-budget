"use client";

import { useActionState, useState } from "react";
import { Bus, Paperclip, Plane, Send, TrainFront } from "lucide-react";
import {
  saveTravelRequest,
  type TravelFormState,
} from "@/app/hacker/travel-actions";
import {
  airlineOptions,
  airportOptions,
  busCompanyOptions,
  countryOptions,
  currencyOptions,
  trainCompanyOptions,
} from "@/components/constants";

const initialState: TravelFormState = {};

const transportOptions = [
  { value: "BUS", label: "Bus", Icon: Bus },
  { value: "TRAIN", label: "Train", Icon: TrainFront },
  { value: "AIRPLANE", label: "Airplane", Icon: Plane },
] as const;

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
  totalCurrency: string;
  luggagePaid: boolean;
  luggagePrice: string;
  ticketPath?: string;
};

function FieldLabel({
  text,
  required,
}: {
  text: string;
  required?: boolean;
}) {
  return (
    <span>
      {text}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </span>
  );
}

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
  const isAirplane = transportMode === "AIRPLANE";
  const serviceLabel = isAirplane ? "Flight number" : "Service number";

  const carrierListId =
    transportMode === "AIRPLANE"
      ? "airline-options"
      : transportMode === "TRAIN"
        ? "train-company-options"
        : "bus-company-options";
  const carrierPlaceholder =
    transportMode === "AIRPLANE"
      ? "Select an airline company"
      : transportMode === "TRAIN"
        ? "Select a train company"
        : "Select a bus company";

  return (
    <form action={formAction} className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <FieldLabel text="Origin city" required />
          <input name="originCity" defaultValue={values.originCity} required />
        </label>
        <label className="field">
          <FieldLabel text="Origin country" required />
          <input
            name="originCountry"
            list="origin-country-options"
            defaultValue={values.originCountry}
            placeholder="Start typing a country"
            required
          />
          <datalist id="origin-country-options">
            {countryOptions.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </label>
        <fieldset className="sm:col-span-2 space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            <FieldLabel text="Transport mode" required />
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {transportOptions.map(({ value, label, Icon }) => {
              const checked = transportMode === value;
              return (
                <label
                  key={value}
                  className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    checked
                      ? "border-violet-500 bg-violet-50 text-violet-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="transportMode"
                    value={value}
                    checked={checked}
                    onChange={() => setTransportMode(value)}
                    className="sr-only"
                  />
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <datalist id="currency-options">
        {currencyOptions.map((currency) => (
          <option key={currency} value={currency} />
        ))}
      </datalist>
      <datalist id="bus-company-options">
        {busCompanyOptions.map((company) => (
          <option key={company} value={company} />
        ))}
      </datalist>
      <datalist id="train-company-options">
        {trainCompanyOptions.map((company) => (
          <option key={company} value={company} />
        ))}
      </datalist>
      <datalist id="airline-options">
        {airlineOptions.map((airline) => (
          <option key={airline} value={airline} />
        ))}
      </datalist>

      {isAirplane && (
        <datalist id="airport-options">
          {airportOptions.map((airport) => (
            <option key={airport} value={airport} />
          ))}
        </datalist>
      )}

      <JourneyFields
        prefix="outbound"
        title="Outbound journey"
        values={values}
        serviceLabel={serviceLabel}
        isAirplane={isAirplane}
        carrierListId={carrierListId}
        carrierPlaceholder={carrierPlaceholder}
      />
      <JourneyFields
        prefix="return"
        title="Return journey"
        values={values}
        serviceLabel={serviceLabel}
        isAirplane={isAirplane}
        carrierListId={carrierListId}
        carrierPlaceholder={carrierPlaceholder}
      />

      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="field sm:col-span-3">
            <FieldLabel text="Total travel price" required />
            <input
              name="totalPrice"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={values.totalPrice}
              required
            />
          </label>
          <label className="field sm:col-span-1">
            <FieldLabel text="Currency" required />
            <input
              name="totalCurrency"
              list="currency-options"
              defaultValue={values.totalCurrency}
              placeholder="EUR (€)"
              required
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-4 sm:items-start">
          <label className="sm:col-span-1 sm:mt-7 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
            <input
              name="luggagePaid"
              type="checkbox"
              checked={luggagePaid}
              onChange={(event) => setLuggagePaid(event.target.checked)}
            />
            Luggage
          </label>
          {luggagePaid ? (
            <label className="field sm:col-span-3">
              <FieldLabel text="Luggage price" required />
              <input
                name="luggagePrice"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={values.luggagePrice}
                required
              />
            </label>
          ) : (
            <div className="sm:col-span-3" />
          )}
        </div>
        <label className="field sm:col-span-2">
          <FieldLabel text="Ticket document" required={!values.ticketPath} />
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
  isAirplane,
  carrierListId,
  carrierPlaceholder,
}: {
  prefix: "outbound" | "return";
  title: string;
  values: TravelFormValues;
  serviceLabel: string;
  isAirplane: boolean;
  carrierListId: string;
  carrierPlaceholder: string;
}) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 p-5">
      <legend className="px-2 font-semibold text-slate-900">{title}</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <FieldLabel text="Departure date and time" required />
          <input
            name={`${prefix}DepartureAt`}
            type="datetime-local"
            defaultValue={values[`${prefix}DepartureAt`]}
            required
          />
        </label>
        <label className="field">
          <FieldLabel
            text={isAirplane ? "Departure airport" : "Departure station"}
            required
          />
          <input
            name={`${prefix}DeparturePlace`}
            defaultValue={values[`${prefix}DeparturePlace`]}
            list={isAirplane ? "airport-options" : undefined}
            placeholder={
              isAirplane
                ? "Select an airport or start typing one"
                : undefined
            }
            required
          />
        </label>
        <label className="field">
          <FieldLabel text="Arrival date and time" required />
          <input
            name={`${prefix}ArrivalAt`}
            type="datetime-local"
            defaultValue={values[`${prefix}ArrivalAt`]}
            required
          />
        </label>
        <label className="field">
          <FieldLabel
            text={isAirplane ? "Arrival airport" : "Arrival station"}
            required
          />
          <input
            name={`${prefix}ArrivalPlace`}
            defaultValue={values[`${prefix}ArrivalPlace`]}
            list={isAirplane ? "airport-options" : undefined}
            placeholder={
              isAirplane ? "Select an airport or start typing one" : undefined
            }
            required
          />
        </label>
        <label className="field">
          <FieldLabel text="Company" required />
          <input
            name={`${prefix}Carrier`}
            defaultValue={values[`${prefix}Carrier`]}
            list={carrierListId}
            placeholder={carrierPlaceholder}
            required
          />
        </label>
        <label className="field">
          <FieldLabel
            text={`${serviceLabel}${isAirplane ? "" : " (optional)"}`}
            required={isAirplane}
          />
          <input
            name={`${prefix}ServiceNumber`}
            defaultValue={values[`${prefix}ServiceNumber`]}
            required={isAirplane}
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
