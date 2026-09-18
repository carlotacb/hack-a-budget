"use client";

import { Plane, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { TravelReimbursementStatus } from "@prisma/client";

type TravelReimbursementRow = {
  id: string;
  hackerName: string;
  hackerEmail: string;
  originCity: string;
  originCountry: string;
  amount: string;
  submitted: string;
  statusLabel: string;
  statusClass: string;
};

type TravelReimbursementsTableProps = {
  reimbursements: TravelReimbursementRow[];
  statuses: TravelReimbursementStatus[];
  statusLabels: Record<TravelReimbursementStatus, string>;
  selectedStatus?: TravelReimbursementStatus;
};

export function TravelReimbursementsTable({
  reimbursements,
  statuses,
  statusLabels,
  selectedStatus,
}: TravelReimbursementsTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return reimbursements;

    return reimbursements.filter((reimbursement) => {
      const haystack = [
        reimbursement.hackerName,
        reimbursement.hackerEmail,
        reimbursement.originCity,
        reimbursement.originCountry,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [reimbursements, query]);

  return (
    <>
      <form className="dashboard-card mb-6 flex flex-wrap items-end gap-3">
        <label className="field min-w-56">
          <span>Status filter</span>
          <select name="status" defaultValue={selectedStatus ?? ""}>
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button">Apply filter</button>
        {selectedStatus && (
          <Link
            href="/organizer/travel-reimbursements"
            className="secondary-button"
          >
            Clear
          </Link>
        )}

        <div className="ml-2 flex h-12 min-w-64 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 transition-colors focus-within:border-violet-500 focus-within:ring-3 focus-within:ring-violet-500/10">
          <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, city, or country"
            className="h-full w-full border-0 bg-transparent p-0 text-sm outline-none"
            aria-label="Search travel reimbursements by name, email, city, or country"
          />
        </div>
      </form>

      <section className="dashboard-card">
        {filtered.length ? (
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
                {filtered.map((reimbursement) => (
                  <tr key={reimbursement.id}>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">
                        {reimbursement.hackerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {reimbursement.hackerEmail}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      {reimbursement.originCity}, {reimbursement.originCountry}
                    </td>
                    <td className="px-3 py-4 font-medium">
                      {reimbursement.amount}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {reimbursement.submitted}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reimbursement.statusClass}`}
                      >
                        {reimbursement.statusLabel}
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
            <p>
              {reimbursements.length
                ? `No reimbursements match "${query}".`
                : "No reimbursements match the selected status."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
