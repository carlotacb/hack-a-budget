import { describe, expect, test } from "vitest";
import { buildTravelDashboard, type DashboardRow } from "@/lib/travel-dashboard";

function row(overrides: Partial<DashboardRow> = {}): DashboardRow {
  return {
    status: "PENDING_REVIEW",
    originCity: "Berlin",
    originCountry: "Germany",
    transportMode: "AIRPLANE",
    totalPriceCents: 10000,
    totalCurrencyCode: "EUR",
    approvedAmountCents: null,
    ...overrides,
  };
}

describe("buildTravelDashboard", () => {
  test("returns empty aggregates for no rows", () => {
    const data = buildTravelDashboard([]);

    expect(data.hackerCount).toBe(0);
    expect(data.currencies).toEqual([]);
    expect(data.countries).toEqual([]);
  });

  test("excludes drafts from every figure but the status breakdown", () => {
    const data = buildTravelDashboard([
      row({ status: "DRAFT" }),
      row({ status: "PENDING_REVIEW" }),
    ]);

    expect(data.hackerCount).toBe(1);
    expect(data.draftCount).toBe(1);
    expect(data.currencies[0].requestedCents).toBe(10000);
    expect(data.countries).toEqual([{ label: "Germany", count: 1 }]);
    expect(data.statusCounts).toContainEqual({ label: "DRAFT", count: 1 });
  });

  test("accepted covers approval onward, paid only final approved", () => {
    const data = buildTravelDashboard([
      row({ status: "PENDING_REVIEW" }),
      row({ status: "REJECTED", approvedAmountCents: 999 }),
      row({ status: "APPROVED", approvedAmountCents: 8000 }),
      row({ status: "FINAL_REVIEW", approvedAmountCents: 7000 }),
      row({ status: "FINAL_APPROVED", approvedAmountCents: 6000 }),
    ]);
    const [eur] = data.currencies;

    expect(eur.requestedCents).toBe(50000);
    expect(eur.acceptedCents).toBe(21000);
    expect(eur.paidCents).toBe(6000);
  });

  test("keeps separate totals per currency, sorted by code", () => {
    const data = buildTravelDashboard([
      row({ totalCurrencyCode: "USD", totalPriceCents: 500 }),
      row({ totalCurrencyCode: "EUR", totalPriceCents: 300 }),
      row({ totalCurrencyCode: "USD", totalPriceCents: 200 }),
    ]);

    expect(data.currencies.map((c) => [c.currency, c.requestedCents])).toEqual([
      ["EUR", 300],
      ["USD", 700],
    ]);
  });

  test("ranks countries, cities and transport by count then name", () => {
    const data = buildTravelDashboard([
      row({ originCity: "Paris", originCountry: "France", transportMode: "TRAIN" }),
      row(),
      row({ originCity: "Munich", originCountry: "Germany" }),
    ]);

    expect(data.countries).toEqual([
      { label: "Germany", count: 2 },
      { label: "France", count: 1 },
    ]);
    expect(data.cities.map((c) => c.label)).toEqual([
      "Berlin, Germany",
      "Munich, Germany",
      "Paris, France",
    ]);
    expect(data.transportModes[0]).toEqual({ label: "AIRPLANE", count: 2 });
  });

  test("treats a missing approved amount as zero", () => {
    const data = buildTravelDashboard([row({ status: "FINAL_APPROVED" })]);

    expect(data.currencies[0].paidCents).toBe(0);
  });
});
