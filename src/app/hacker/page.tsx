import { Plane } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { DemoProofForm } from "@/components/demo-proof-form";
import {
  TravelReimbursementForm,
  type TravelFormValues,
} from "@/components/travel-reimbursement-form";
import { formatCurrencyOption } from "@/components/constants";
import { prisma } from "@/lib/prisma";
import {
  editableTravelStatuses,
  formatEventDateTime,
  formatLocalDateTime,
  formatMoney,
  requireHacker,
  travelStatusClasses,
  travelStatusLabels,
} from "@/lib/travel";

export default async function HackerPage() {
  const user = await requireHacker();
  const [reimbursement, settings] = await Promise.all([
    prisma.travelReimbursement.findUnique({
      where: { hackerId: user.id },
      include: {
        statusEvents: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.travelEventSettings.findUnique({ where: { id: "event" } }),
  ]);

  const canEdit =
    !reimbursement || editableTravelStatuses.includes(reimbursement.status);
  const canSubmitDemo =
    reimbursement?.status === "APPROVED" ||
    reimbursement?.status === "FINAL_REVIEW";
  const unlocked =
    Boolean(settings?.hackathonStartAt) &&
    new Date() >= settings!.hackathonStartAt!;
  const values: TravelFormValues = reimbursement
    ? {
        originCity: reimbursement.originCity,
        originCountry: reimbursement.originCountry,
        transportMode: reimbursement.transportMode,
        outboundDepartureAt: formatLocalDateTime(
          reimbursement.outboundDepartureAt,
        ),
        outboundDeparturePlace: reimbursement.outboundDeparturePlace,
        outboundArrivalAt: formatLocalDateTime(reimbursement.outboundArrivalAt),
        outboundArrivalPlace: reimbursement.outboundArrivalPlace,
        outboundCarrier: reimbursement.outboundCarrier,
        outboundServiceNumber: reimbursement.outboundServiceNumber ?? "",
        returnDepartureAt: formatLocalDateTime(
          reimbursement.returnDepartureAt,
        ),
        returnDeparturePlace: reimbursement.returnDeparturePlace,
        returnArrivalAt: formatLocalDateTime(reimbursement.returnArrivalAt),
        returnArrivalPlace: reimbursement.returnArrivalPlace,
        returnCarrier: reimbursement.returnCarrier,
        returnServiceNumber: reimbursement.returnServiceNumber ?? "",
        totalPrice: (reimbursement.totalPriceCents / 100).toFixed(2),
        totalCurrency: formatCurrencyOption(reimbursement.totalCurrencyCode),
        luggagePaid: reimbursement.luggagePaid,
        luggagePrice: reimbursement.luggagePriceCents
          ? (reimbursement.luggagePriceCents / 100).toFixed(2)
          : "",
        ticketPath: reimbursement.ticketPath,
      }
    : {
        originCity: "",
        originCountry: "",
        transportMode: "TRAIN",
        outboundDepartureAt: "",
        outboundDeparturePlace: "",
        outboundArrivalAt: "",
        outboundArrivalPlace: "",
        outboundCarrier: "",
        outboundServiceNumber: "",
        returnDepartureAt: "",
        returnDeparturePlace: "",
        returnArrivalAt: "",
        returnArrivalPlace: "",
        returnCarrier: "",
        returnServiceNumber: "",
        totalPrice: "",
        totalCurrency: formatCurrencyOption("EUR"),
        luggagePaid: false,
        luggagePrice: "",
      };

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppHeader name={user.name} role="Hacker" />
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-12 lg:px-8">

        <section className="dashboard-card" id="travel-reimbursement">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-violet-700">
                <Plane size={20} aria-hidden="true" />
                <p className="eyebrow">Travel reimbursement</p>
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                Your round trip
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Submit your travel reimbursement request to get reimbursed for your travel expenses. Make sure your ticket follows the following rules [Link with the rules]
              </p>
            </div>
            {reimbursement && (
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${travelStatusClasses[reimbursement.status]}`}
              >
                {travelStatusLabels[reimbursement.status]}
              </span>
            )}
          </div>

          {reimbursement?.organizerNote && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Reviewer note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-800">
                {reimbursement.organizerNote}
              </p>
            </div>
          )}

          {canEdit ? (
            <div className="mt-8">
              <TravelReimbursementForm
                values={values}
                isResubmission={Boolean(reimbursement)}
              />
            </div>
          ) : (
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <StatusFact
                label="Submitted total"
                value={formatMoney(
                  reimbursement.totalPriceCents,
                  reimbursement.totalCurrencyCode,
                )}
              />
              <StatusFact
                label="Approved reimbursement"
                value={formatMoney(
                  reimbursement.approvedAmountCents,
                  reimbursement.totalCurrencyCode,
                )}
              />
              <StatusFact
                label="Submitted"
                value={formatEventDateTime(reimbursement.submittedAt)}
              />
            </div>
          )}

          {reimbursement &&
            ["APPROVED", "FINAL_REVIEW", "FINAL_APPROVED"].includes(
              reimbursement.status,
            ) && (
              <div className="mt-8 space-y-6 border-t border-slate-200 pt-7">
                <div className="rounded-2xl bg-violet-50 p-5 text-sm leading-6 text-violet-950">
                  <p className="font-semibold">Reimbursement and event instructions</p>
                  <p className="mt-2 whitespace-pre-wrap">
                    {settings?.reimbursementInstructions ??
                      "Lorem ipsum dolor sit amet, consectetur adipiscing elit."}
                  </p>
                </div>
                {canSubmitDemo && (
                  <DemoProofForm
                    unlocked={unlocked}
                    unlockLabel={formatEventDateTime(settings?.hackathonStartAt)}
                    demoUrl={reimbursement.demoUrl ?? ""}
                    demoComment={reimbursement.demoComment ?? ""}
                  />
                )}
                {reimbursement.demoSubmittedAt && (
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <p className="font-semibold">Final review</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Demo proof submitted {formatEventDateTime(reimbursement.demoSubmittedAt)}.
                      {" "}
                      {settings?.finalReviewInstructions}
                    </p>
                  </div>
                )}
              </div>
            )}

          {reimbursement && reimbursement.statusEvents.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-7">
              <h3 className="text-lg font-semibold">Status history</h3>
              <ol className="mt-4 space-y-3">
                {reimbursement.statusEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">
                        {travelStatusLabels[event.toStatus]}
                      </span>
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
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
