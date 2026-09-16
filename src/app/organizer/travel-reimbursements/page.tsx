import Link from "next/link";
import type { TravelReimbursementStatus } from "@prisma/client";
import { Plane } from "lucide-react";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import {
  formatEventDateTime,
  formatMoney,
  travelStatusClasses,
  travelStatusLabels,
} from "@/lib/travel";

const statuses = Object.keys(
  travelStatusLabels,
) as TravelReimbursementStatus[];

export default async function TravelReimbursementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireOrganizer(["ADMIN", "DIRECTOR"]);
  const { status } = await searchParams;
  const selectedStatus = statuses.includes(
    status as TravelReimbursementStatus,
  )
    ? (status as TravelReimbursementStatus)
    : undefined;
  const reimbursements = await prisma.travelReimbursement.findMany({
    where: selectedStatus ? { status: selectedStatus } : undefined,
    include: {
      hacker: { select: { name: true, email: true } },
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Travel</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Travel reimbursements
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Review travel requests, demo proof, and final requirements.
        </p>
      </div>

      <form className="dashboard-card mb-6 flex flex-wrap items-end gap-3">
        <label className="field min-w-56">
          <span>Status filter</span>
          <select name="status" defaultValue={selectedStatus ?? ""}>
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {travelStatusLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button">Apply filter</button>
        {selectedStatus && (
          <Link href="/organizer/travel-reimbursements" className="secondary-button">
            Clear
          </Link>
        )}
      </form>

      <section className="dashboard-card">
        {reimbursements.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Hacker</th>
                  <th className="px-3 py-3">Origin</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Submitted</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reimbursements.map((reimbursement) => (
                  <tr key={reimbursement.id}>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">
                        {reimbursement.hacker.name ?? "Unnamed hacker"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {reimbursement.hacker.email}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      {reimbursement.originCity}, {reimbursement.originCountry}
                    </td>
                    <td className="px-3 py-4 font-medium">
                      {formatMoney(reimbursement.totalPriceCents)}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {formatEventDateTime(reimbursement.submittedAt)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${travelStatusClasses[reimbursement.status]}`}
                      >
                        {travelStatusLabels[reimbursement.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <Link
                        href={`/organizer/travel-reimbursements/${reimbursement.id}`}
                        className="font-semibold text-violet-700 hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Plane size={36} aria-hidden="true" />
            <h3>No travel submissions</h3>
            <p>No reimbursements match the selected status.</p>
          </div>
        )}
      </section>
    </main>
  );
}
