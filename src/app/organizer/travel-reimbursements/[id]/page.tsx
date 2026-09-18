import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalRequirementForms, TravelReviewForm } from "@/components/travel-review-forms";
import { TicketViewerButton } from "@/components/ticket-viewer-button";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import {
  formatEventDateTime,
  formatMoney,
  transportLabels,
  travelStatusClasses,
  travelStatusLabels,
} from "@/lib/travel";

export default async function TravelReimbursementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrganizer(["ADMIN", "DIRECTOR"]);
  const { id } = await params;
  const reimbursement = await prisma.travelReimbursement.findUnique({
    where: { id },
    include: {
      hacker: { select: { name: true, email: true } },
      initialReviewer: { select: { name: true } },
      finalReviewer: { select: { name: true } },
      statusEvents: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!reimbursement) {
    notFound();
  }

  const messageTemplates =
    reimbursement.status === "PENDING_REVIEW"
      ? await prisma.travelMessageTemplate.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
        })
      : [];

  const requirements =
    reimbursement.status === "FINAL_REVIEW"
      ? await prisma.travelFinalRequirement.findMany({
          where: { active: true },
          include: {
            checks: {
              where: { reimbursementId: reimbursement.id },
              select: { checked: true },
            },
          },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10 lg:px-8">
      <div>
        <Link
          href="/organizer/travel-reimbursements"
          className="text-sm font-semibold text-violet-700 hover:underline"
        >
          ← All travel reimbursements
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Travel review</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">
              {reimbursement.hacker.name ?? "Unnamed hacker"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {reimbursement.hacker.email}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${travelStatusClasses[reimbursement.status]}`}
          >
            {travelStatusLabels[reimbursement.status]}
          </span>
        </div>
      </div>

      <section className="dashboard-card">
        <h2 className="text-xl font-semibold">Request details</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Origin" value={`${reimbursement.originCity}, ${reimbursement.originCountry}`} />
          <Fact label="Transport" value={transportLabels[reimbursement.transportMode]} />
          <Fact
            label="Travel total"
            value={formatMoney(
              reimbursement.totalPriceCents,
              reimbursement.totalCurrencyCode,
            )}
          />
          <Fact
            label="Luggage"
            value={
              reimbursement.luggagePaid
                ? formatMoney(
                    reimbursement.luggagePriceCents,
                    reimbursement.totalCurrencyCode,
                  )
                : "Not paid separately"
            }
          />
        </dl>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Journey
            title="Outbound"
            departure={`${formatEventDateTime(reimbursement.outboundDepartureAt)} — ${reimbursement.outboundDeparturePlace}`}
            arrival={`${formatEventDateTime(reimbursement.outboundArrivalAt)} — ${reimbursement.outboundArrivalPlace}`}
            carrier={reimbursement.outboundCarrier}
            service={reimbursement.outboundServiceNumber}
          />
          <Journey
            title="Return"
            departure={`${formatEventDateTime(reimbursement.returnDepartureAt)} — ${reimbursement.returnDeparturePlace}`}
            arrival={`${formatEventDateTime(reimbursement.returnArrivalAt)} — ${reimbursement.returnArrivalPlace}`}
            carrier={reimbursement.returnCarrier}
            service={reimbursement.returnServiceNumber}
          />
        </div>
        <TicketViewerButton ticketPath={reimbursement.ticketPath} />
      </section>

      {reimbursement.status === "PENDING_REVIEW" && (
        <section className="dashboard-card">
          <h2 className="mb-5 text-xl font-semibold">Initial review</h2>
          <TravelReviewForm
            reimbursementId={reimbursement.id}
            submittedTotal={(reimbursement.totalPriceCents / 100).toFixed(2)}
            currencyCode={reimbursement.totalCurrencyCode}
            messageTemplates={messageTemplates}
          />
        </section>
      )}

      {reimbursement.organizerNote && (
        <section className="dashboard-card">
          <h2 className="text-xl font-semibold">Reviewer note</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {reimbursement.organizerNote}
          </p>
        </section>
      )}

      {reimbursement.demoUrl && (
        <section className="dashboard-card">
          <h2 className="text-xl font-semibold">Demo proof</h2>
          <a
            href={reimbursement.demoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-semibold text-violet-700 hover:underline"
          >
            {reimbursement.demoUrl}
          </a>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
            {reimbursement.demoComment || "No additional comments."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Submitted {formatEventDateTime(reimbursement.demoSubmittedAt)}
          </p>
        </section>
      )}

      {reimbursement.status === "FINAL_REVIEW" && (
        <section className="dashboard-card">
          <h2 className="mb-5 text-xl font-semibold">Final requirements</h2>
          <FinalRequirementForms
            reimbursementId={reimbursement.id}
            requirements={requirements.map((requirement) => ({
              id: requirement.id,
              name: requirement.name,
              checked: requirement.checks[0]?.checked ?? false,
            }))}
          />
        </section>
      )}

      {(reimbursement.initialReviewedAt || reimbursement.finalApprovedAt) && (
        <section className="dashboard-card grid gap-4 sm:grid-cols-2">
          <Fact
            label="Initial review"
            value={
              reimbursement.initialReviewedAt
                ? `${reimbursement.initialReviewer?.name ?? "Deleted user"} — ${formatEventDateTime(reimbursement.initialReviewedAt)}`
                : "Not reviewed"
            }
          />
          <Fact
            label="Final approval"
            value={
              reimbursement.finalApprovedAt
                ? `${reimbursement.finalReviewer?.name ?? "Deleted user"} — ${formatEventDateTime(reimbursement.finalApprovedAt)}`
                : "Not approved"
            }
          />
        </section>
      )}

      <section className="dashboard-card">
        <h2 className="text-xl font-semibold">Audit history</h2>
        <ol className="mt-4 space-y-3">
          {reimbursement.statusEvents.map((event) => (
            <li key={event.id} className="rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{travelStatusLabels[event.toStatus]}</strong>
                <time className="text-slate-500">
                  {formatEventDateTime(event.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-slate-600">
                {event.actor?.name ?? "Deleted user"}
                {event.note ? ` — ${event.note}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function Journey({
  title,
  departure,
  arrival,
  carrier,
  service,
}: {
  title: string;
  departure: string;
  arrival: string;
  carrier: string;
  service: string | null;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 p-5">
      <h3 className="font-semibold">{title}</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <Fact label="Departure" value={departure} />
        <Fact label="Arrival" value={arrival} />
        <Fact label="Carrier/company" value={carrier} />
        <Fact label="Service/flight number" value={service || "Not provided"} />
      </dl>
    </article>
  );
}
