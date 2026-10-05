import type { TravelReimbursementStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { TravelReimbursementsTable } from "@/components/travel-reimbursements-table";
import { requireOrganizer } from "@/lib/organizer";
import { isTravelReimbursementEnabled } from "@/lib/hackathon";
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
  const organizer = await requireOrganizer(["ADMIN", "DIRECTOR"]);
  const { hackathonId } = organizer;
  if (!(await isTravelReimbursementEnabled(hackathonId))) {
    redirect("/organizer");
  }
  const { status } = await searchParams;
  const selectedStatus = statuses.includes(
    status as TravelReimbursementStatus,
  )
    ? (status as TravelReimbursementStatus)
    : undefined;
  const reimbursements = await prisma.travelReimbursement.findMany({
    where: { hackathonId, ...(selectedStatus ? { status: selectedStatus } : {}) },
    include: {
      hacker: { select: { name: true, email: true } },
    },
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });

  const rows = reimbursements.map((reimbursement) => ({
    id: reimbursement.id,
    hackerName: reimbursement.hacker.name ?? "Unnamed hacker",
    hackerEmail: reimbursement.hacker.email,
    originCity: reimbursement.originCity,
    originCountry: reimbursement.originCountry,
    amount: formatMoney(
      reimbursement.totalPriceCents,
      reimbursement.totalCurrencyCode,
    ),
    submitted: formatEventDateTime(reimbursement.submittedAt),
    statusLabel: travelStatusLabels[reimbursement.status],
    statusClass: travelStatusClasses[reimbursement.status],
  }));

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

      <TravelReimbursementsTable
        reimbursements={rows}
        statuses={statuses}
        statusLabels={travelStatusLabels}
        selectedStatus={selectedStatus}
      />
    </main>
  );
}
