import type { TransportMode, TravelReimbursementStatus } from "@prisma/client";
import { toEurCents, type EurRates } from "@/lib/currency";

export type DashboardRow = {
  status: TravelReimbursementStatus;
  originCity: string;
  originCountry: string;
  transportMode: TransportMode;
  totalPriceCents: number;
  totalCurrencyCode: string;
  approvedAmountCents: number | null;
};

export type CurrencyTotals = {
  currency: string;
  requestedCents: number;
  acceptedCents: number;
  paidCents: number;
};

export type CountEntry = { label: string; count: number };

const ACCEPTED_STATUSES: TravelReimbursementStatus[] = [
  "APPROVED",
  "FINAL_REVIEW",
  "FINAL_APPROVED",
];

function tally(values: string[]): CountEntry[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Drafts are excluded from every figure except the status breakdown: a
 * draft hasn't been submitted, so it isn't a request yet. "Paid" is the
 * approved amount of FINAL_APPROVED requests; "accepted" is the approved
 * amount from initial approval onward. Money is kept per currency because
 * requests can be in different currencies.
 */
export function buildTravelDashboard(rows: DashboardRow[]) {
  const submitted = rows.filter((row) => row.status !== "DRAFT");
  const currencies = new Map<string, CurrencyTotals>();

  for (const row of submitted) {
    const totals = currencies.get(row.totalCurrencyCode) ?? {
      currency: row.totalCurrencyCode,
      requestedCents: 0,
      acceptedCents: 0,
      paidCents: 0,
    };
    const approved = row.approvedAmountCents ?? 0;

    totals.requestedCents += row.totalPriceCents;
    if (ACCEPTED_STATUSES.includes(row.status)) totals.acceptedCents += approved;
    if (row.status === "FINAL_APPROVED") totals.paidCents += approved;
    currencies.set(row.totalCurrencyCode, totals);
  }

  return {
    hackerCount: submitted.length,
    draftCount: rows.length - submitted.length,
    currencies: [...currencies.values()].sort((a, b) =>
      a.currency.localeCompare(b.currency),
    ),
    statusCounts: tally(rows.map((row) => row.status)),
    countries: tally(submitted.map((row) => row.originCountry)),
    cities: tally(
      submitted.map((row) => `${row.originCity}, ${row.originCountry}`),
    ),
    transportModes: tally(submitted.map((row) => row.transportMode)),
  };
}

export type EurTotals = {
  requestedCents: number;
  acceptedCents: number;
  paidCents: number;
  /** Currency codes that had no known rate and were left out of the totals. */
  unconverted: string[];
};

/**
 * Combines the per-currency totals into a single EUR-equivalent figure using
 * a live rates table (see src/lib/currency.ts). Pure and synchronous so it's
 * easy to test — the network fetch happens separately, by the caller.
 */
export function combineInEur(
  currencies: CurrencyTotals[],
  rates: EurRates,
): EurTotals {
  const totals: EurTotals = {
    requestedCents: 0,
    acceptedCents: 0,
    paidCents: 0,
    unconverted: [],
  };

  for (const entry of currencies) {
    const requested = toEurCents(entry.requestedCents, entry.currency, rates);
    const accepted = toEurCents(entry.acceptedCents, entry.currency, rates);
    const paid = toEurCents(entry.paidCents, entry.currency, rates);

    if (requested === null || accepted === null || paid === null) {
      totals.unconverted.push(entry.currency);
      continue;
    }

    totals.requestedCents += requested;
    totals.acceptedCents += accepted;
    totals.paidCents += paid;
  }

  return totals;
}
