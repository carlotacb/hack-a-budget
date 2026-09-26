// Client-safe: no server-only imports (unlike @/lib/travel, which pulls in auth).
export function formatMoney(
  cents: number | null | undefined,
  currencyCode = "EUR",
) {
  if (cents === null || cents === undefined) {
    return "Not set";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).format(cents / 100);
}
