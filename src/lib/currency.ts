import { Convert } from "easy-currencies";

/** Rate FROM EUR to a currency: 1 EUR = rates[CODE] units of CODE. */
export type EurRates = Record<string, number>;

/**
 * Fetches live EUR exchange rates once (via easy-currencies, no API key
 * needed) so any number of currencies can be converted to EUR without an
 * extra network call each. Returns null on failure so callers can degrade
 * gracefully instead of crashing the page.
 */
export async function fetchEurRates(): Promise<EurRates | null> {
  try {
    const result = await Convert().from("EUR").fetch();
    return result.rates as EurRates;
  } catch {
    return null;
  }
}

/** Converts an amount in `currency` to EUR cents, or null if no rate is known. */
export function toEurCents(
  amountCents: number,
  currency: string,
  rates: EurRates,
): number | null {
  if (currency === "EUR") return amountCents;
  const rate = rates[currency];
  if (!rate) return null;
  return Math.round(amountCents / rate);
}
