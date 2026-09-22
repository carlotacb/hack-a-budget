import type { TravelReimbursementStatus } from "@prisma/client";
import { CheckCircle2, Users, Wallet, Banknote } from "lucide-react";
import { BarList } from "@/components/bar-list";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { formatMoney, transportLabels, travelStatusLabels } from "@/lib/travel";
import { buildTravelDashboard } from "@/lib/travel-dashboard";

const TOP_LIMIT = 8;

const statusBarClasses: Record<TravelReimbursementStatus, string> = {
  DRAFT: "bg-slate-400",
  PENDING_REVIEW: "bg-amber-400",
  CHANGES_REQUESTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  APPROVED: "bg-blue-400",
  FINAL_REVIEW: "bg-violet-400",
  FINAL_APPROVED: "bg-emerald-500",
};

export default async function TravelDashboardPage() {
  await requireOrganizer(["ADMIN", "DIRECTOR"]);

  const rows = await prisma.travelReimbursement.findMany({
    select: {
      status: true,
      originCity: true,
      originCountry: true,
      transportMode: true,
      totalPriceCents: true,
      totalCurrencyCode: true,
      approvedAmountCents: true,
    },
  });
  const data = buildTravelDashboard(rows);

  const moneyLines = (pick: "requestedCents" | "acceptedCents" | "paidCents") =>
    data.currencies.length ? (
      data.currencies.map((totals) => (
        <strong key={totals.currency}>
          {formatMoney(totals[pick], totals.currency)}
        </strong>
      ))
    ) : (
      <strong>—</strong>
    );

  const moneyCards = [
    { label: "Total requested", pick: "requestedCents", icon: Wallet },
    { label: "Accepted", pick: "acceptedCents", icon: CheckCircle2 },
    { label: "Paid (final approved)", pick: "paidCents", icon: Banknote },
  ] as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Travel</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Travel dashboard
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Where hackers travel from, what they asked for, and how much has been
          accepted and paid. Drafts are only counted in the status breakdown.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="metric-card metric-card-featured">
          <Users />
          <p>Hackers with a request</p>
          <strong>{data.hackerCount}</strong>
        </article>
        {moneyCards.map(({ label, pick, icon: Icon }) => (
          <article key={label} className="metric-card">
            <Icon />
            <p>{label}</p>
            {moneyLines(pick)}
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="dashboard-card">
          <p className="eyebrow">Pipeline</p>
          <h2 className="mb-5 mt-1 text-xl font-semibold">Hackers per status</h2>
          <BarList
            items={data.statusCounts.map((entry) => ({
              label: travelStatusLabels[entry.label as TravelReimbursementStatus],
              value: entry.count,
              barClass: statusBarClasses[entry.label as TravelReimbursementStatus],
            }))}
          />
          {data.draftCount > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              {data.draftCount} draft{data.draftCount === 1 ? "" : "s"} not yet
              submitted.
            </p>
          )}
        </section>

        <section className="dashboard-card">
          <p className="eyebrow">Money</p>
          <h2 className="mb-5 mt-1 text-xl font-semibold">By currency</h2>
          {data.currencies.length ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2">Currency</th>
                  <th className="pb-2 text-right">Requested</th>
                  <th className="pb-2 text-right">Accepted</th>
                  <th className="pb-2 text-right">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.currencies.map((totals) => (
                  <tr key={totals.currency}>
                    <td className="py-3 font-semibold">{totals.currency}</td>
                    <td className="py-3 text-right">
                      {formatMoney(totals.requestedCents, totals.currency)}
                    </td>
                    <td className="py-3 text-right">
                      {formatMoney(totals.acceptedCents, totals.currency)}
                    </td>
                    <td className="py-3 text-right">
                      {formatMoney(totals.paidCents, totals.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">No submitted requests yet.</p>
          )}
        </section>

        <section className="dashboard-card">
          <p className="eyebrow">Origin</p>
          <h2 className="mb-5 mt-1 text-xl font-semibold">Countries</h2>
          <BarList
            items={data.countries
              .slice(0, TOP_LIMIT)
              .map((entry) => ({ label: entry.label, value: entry.count }))}
          />
        </section>

        <section className="dashboard-card">
          <p className="eyebrow">Origin</p>
          <h2 className="mb-5 mt-1 text-xl font-semibold">Cities</h2>
          <BarList
            items={data.cities
              .slice(0, TOP_LIMIT)
              .map((entry) => ({ label: entry.label, value: entry.count }))}
          />
        </section>

        <section className="dashboard-card lg:col-span-2">
          <p className="eyebrow">Transport</p>
          <h2 className="mb-5 mt-1 text-xl font-semibold">Transport mode</h2>
          <BarList
            items={data.transportModes.map((entry) => ({
              label: transportLabels[entry.label as keyof typeof transportLabels],
              value: entry.count,
              barClass: "bg-sky-500",
            }))}
          />
        </section>
      </div>
    </main>
  );
}
