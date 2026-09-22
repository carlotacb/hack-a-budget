import { describe, expect, test, vi, beforeEach } from "vitest";

const convertMock = vi.fn();
vi.mock("easy-currencies", () => ({
  Convert: (...args: unknown[]) => convertMock(...args),
}));

const { fetchEurRates, toEurCents } = await import("@/lib/currency");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toEurCents", () => {
  const rates = { USD: 1.1, GBP: 0.85 };

  test("returns the amount unchanged for EUR", () => {
    expect(toEurCents(1000, "EUR", rates)).toBe(1000);
  });

  test("converts using the rate FROM EUR to the currency", () => {
    expect(toEurCents(1100, "USD", rates)).toBe(1000);
  });

  test("returns null when there is no rate for the currency", () => {
    expect(toEurCents(1000, "JPY", rates)).toBeNull();
  });
});

describe("fetchEurRates", () => {
  test("returns the rates table on success", async () => {
    const from = vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue({ rates: { USD: 1.1 } }),
    });
    convertMock.mockReturnValue({ from });

    const rates = await fetchEurRates();

    expect(from).toHaveBeenCalledWith("EUR");
    expect(rates).toEqual({ USD: 1.1 });
  });

  test("returns null when the request fails", async () => {
    const from = vi.fn().mockReturnValue({
      fetch: vi.fn().mockRejectedValue(new Error("network down")),
    });
    convertMock.mockReturnValue({ from });

    expect(await fetchEurRates()).toBeNull();
  });
});
