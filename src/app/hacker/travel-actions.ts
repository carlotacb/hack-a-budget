"use server";

import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  editableTravelStatuses,
  getHackerId,
  parseLocalDateTime,
} from "@/lib/travel";
import { prisma } from "@/lib/prisma";

export type TravelFormState = {
  error?: string;
  success?: boolean;
};

const travelSchema = z.object({
  originCity: z.string().trim().min(2, "Enter your origin city."),
  originCountry: z.string().trim().min(2, "Enter your origin country."),
  transportMode: z.enum(["BUS", "TRAIN", "AIRPLANE"], {
    error: "Select a valid transport mode.",
  }),
  outboundDepartureAt: z.string(),
  outboundDeparturePlace: z
    .string()
    .trim()
    .min(2, "Enter the outbound departure airport or station."),
  outboundArrivalAt: z.string(),
  outboundArrivalPlace: z
    .string()
    .trim()
    .min(2, "Enter the outbound arrival airport or station."),
  outboundCarrier: z
    .string()
    .trim()
    .min(2, "Enter the outbound carrier or company."),
  outboundServiceNumber: z.string().trim().optional(),
  returnDepartureAt: z.string(),
  returnDeparturePlace: z
    .string()
    .trim()
    .min(2, "Enter the return departure airport or station."),
  returnArrivalAt: z.string(),
  returnArrivalPlace: z
    .string()
    .trim()
    .min(2, "Enter the return arrival airport or station."),
  returnCarrier: z
    .string()
    .trim()
    .min(2, "Enter the return carrier or company."),
  returnServiceNumber: z.string().trim().optional(),
  totalPrice: z.coerce
    .number()
    .positive("Total travel price must be greater than zero.")
    .max(1_000_000, "Total travel price is too large."),
  totalCurrency: z.string().trim().min(3, "Select a valid currency."),
  luggagePaid: z.string().optional(),
  luggagePrice: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.transportMode !== "AIRPLANE") {
    return;
  }

  if (!data.outboundServiceNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["outboundServiceNumber"],
      message: "Enter the outbound flight number.",
    });
  }

  if (!data.returnServiceNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["returnServiceNumber"],
      message: "Enter the return flight number.",
    });
  }
});

const ticketTypes: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function hasExpectedSignature(type: string, buffer: Buffer) {
  if (type === "application/pdf") {
    return buffer.subarray(0, 5).toString() === "%PDF-";
  }
  if (type === "image/jpeg") {
    return (
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    );
  }
  if (type === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (type === "image/webp") {
    return (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WEBP"
    );
  }
  return false;
}

async function saveTicket(ticket: File) {
  const extension = ticketTypes[ticket.type];

  if (!extension) {
    throw new Error("Ticket must be a PDF, JPG, PNG, or WebP file.");
  }
  if (ticket.size === 0) {
    throw new Error("Select one ticket document.");
  }
  if (ticket.size > 5 * 1024 * 1024) {
    throw new Error("Ticket must be 5 MB or smaller.");
  }

  const buffer = Buffer.from(await ticket.arrayBuffer());

  if (!hasExpectedSignature(ticket.type, buffer)) {
    throw new Error("The ticket contents do not match the selected file type.");
  }

  const blob = await put(
    `travel-reimbursements/${randomUUID()}${extension}`,
    buffer,
    { access: "public" },
  );
  return blob.url;
}

async function removeTravelTicket(ticketPath: string) {
  if (!ticketPath.includes("/travel-reimbursements/")) {
    return;
  }

  await del(ticketPath).catch((error) => {
    console.error("Failed to remove travel ticket", error);
  });
}

export async function saveTravelRequest(
  _state: TravelFormState,
  formData: FormData,
): Promise<TravelFormState> {
  const hackerId = await getHackerId();

  if (!hackerId) {
    return { error: "Only hackers can submit travel reimbursements." };
  }

  const parsed = travelSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const dates = {
    outboundDepartureAt: parseLocalDateTime(
      parsed.data.outboundDepartureAt,
    ),
    outboundArrivalAt: parseLocalDateTime(parsed.data.outboundArrivalAt),
    returnDepartureAt: parseLocalDateTime(parsed.data.returnDepartureAt),
    returnArrivalAt: parseLocalDateTime(parsed.data.returnArrivalAt),
  };

  if (Object.values(dates).some((date) => !date)) {
    return { error: "Enter valid dates and times for every journey." };
  }

  const currencyMatch = /^([A-Z]{3})\b/.exec(parsed.data.totalCurrency.trim());
  const totalCurrencyCode = currencyMatch?.[1];

  if (!totalCurrencyCode) {
    return { error: "Select a valid currency." };
  }
  try {
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: totalCurrencyCode,
    }).format(0);
  } catch {
    return { error: "Select a valid currency." };
  }

  const outboundDepartureAt = dates.outboundDepartureAt!;
  const outboundArrivalAt = dates.outboundArrivalAt!;
  const returnDepartureAt = dates.returnDepartureAt!;
  const returnArrivalAt = dates.returnArrivalAt!;

  if (outboundDepartureAt >= outboundArrivalAt) {
    return { error: "Outbound departure must be before arrival." };
  }
  if (returnDepartureAt >= returnArrivalAt) {
    return { error: "Return departure must be before arrival." };
  }
  if (outboundArrivalAt >= returnDepartureAt) {
    return {
      error: "The return journey must depart after the outbound journey arrives.",
    };
  }

  const luggagePaid = parsed.data.luggagePaid === "on";
  const luggagePrice = Number(parsed.data.luggagePrice || 0);

  if (luggagePaid && (!Number.isFinite(luggagePrice) || luggagePrice <= 0)) {
    return { error: "Enter a positive luggage price when luggage was paid." };
  }
  if (luggagePrice > 1_000_000) {
    return { error: "Luggage price is too large." };
  }

  const existing = await prisma.travelReimbursement.findUnique({
    where: { hackerId },
    select: { id: true, status: true, ticketPath: true },
  });

  if (existing && !editableTravelStatuses.includes(existing.status)) {
    return {
      error: "This reimbursement cannot be edited in its current status.",
    };
  }

  const ticket = formData.get("ticket");
  let newTicketPath: string | null = null;

  if (
    !existing &&
    (!(ticket instanceof File) || ticket.size === 0)
  ) {
    return { error: "Upload exactly one ticket document." };
  }

  try {
    if (ticket instanceof File && ticket.size > 0) {
      newTicketPath = await saveTicket(ticket);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Ticket upload failed.",
    };
  }

  const ticketPath = newTicketPath ?? existing?.ticketPath;

  if (!ticketPath) {
    return { error: "Upload exactly one ticket document." };
  }

  const now = new Date();
  const data = {
    originCity: parsed.data.originCity,
    originCountry: parsed.data.originCountry,
    transportMode: parsed.data.transportMode,
    outboundDepartureAt,
    outboundDeparturePlace: parsed.data.outboundDeparturePlace,
    outboundArrivalAt,
    outboundArrivalPlace: parsed.data.outboundArrivalPlace,
    outboundCarrier: parsed.data.outboundCarrier,
    outboundServiceNumber: parsed.data.outboundServiceNumber || null,
    returnDepartureAt,
    returnDeparturePlace: parsed.data.returnDeparturePlace,
    returnArrivalAt,
    returnArrivalPlace: parsed.data.returnArrivalPlace,
    returnCarrier: parsed.data.returnCarrier,
    returnServiceNumber: parsed.data.returnServiceNumber || null,
    totalPriceCents: Math.round(parsed.data.totalPrice * 100),
    totalCurrencyCode,
    luggagePaid,
    luggagePriceCents: luggagePaid ? Math.round(luggagePrice * 100) : null,
    ticketPath,
    status: "PENDING_REVIEW" as const,
    submittedAt: now,
    demoUrl: null,
    demoComment: null,
    demoSubmittedAt: null,
    finalReviewerId: null,
    finalApprovedAt: null,
  };

  try {
    await prisma.$transaction(async (tx) => {
      const reimbursement = existing
        ? await tx.travelReimbursement.update({
            where: { id: existing.id },
            data,
          })
        : await tx.travelReimbursement.create({
            data: { ...data, hackerId },
          });

      await tx.travelStatusEvent.create({
        data: {
          reimbursementId: reimbursement.id,
          actorId: hackerId,
          fromStatus: existing?.status ?? null,
          toStatus: "PENDING_REVIEW",
          note: existing ? "Travel request resubmitted." : "Travel request submitted.",
        },
      });
    });
  } catch (error) {
    if (newTicketPath) {
      await removeTravelTicket(newTicketPath);
    }
    throw error;
  }

  if (
    newTicketPath &&
    existing?.ticketPath &&
    existing.ticketPath !== newTicketPath
  ) {
    await removeTravelTicket(existing.ticketPath);
  }

  revalidatePath("/hacker");
  revalidatePath("/organizer/travel-reimbursements");
  return { success: true };
}

const demoSchema = z.object({
  demoUrl: z
    .string()
    .trim()
    .url("Enter a valid project or demo URL.")
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "Demo URL must start with http:// or https://.",
    }),
  demoComment: z.string().trim().max(2000, "Comment is too long."),
});

export async function saveDemoProof(
  _state: TravelFormState,
  formData: FormData,
): Promise<TravelFormState> {
  const hackerId = await getHackerId();

  if (!hackerId) {
    return { error: "Only hackers can submit demo proof." };
  }

  const parsed = demoSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [reimbursement, settings] = await Promise.all([
    prisma.travelReimbursement.findUnique({ where: { hackerId } }),
    prisma.travelEventSettings.findUnique({ where: { id: "event" } }),
  ]);

  if (
    !reimbursement ||
    (reimbursement.status !== "APPROVED" &&
      reimbursement.status !== "FINAL_REVIEW")
  ) {
    return {
      error: "Demo proof requires an approved travel reimbursement.",
    };
  }
  if (!settings?.hackathonStartAt || new Date() < settings.hackathonStartAt) {
    return { error: "Demo proof is not unlocked yet." };
  }

  const previousStatus = reimbursement.status;
  const note =
    previousStatus === "APPROVED" ? "Demo proof submitted." : "Demo proof updated.";

  await prisma.$transaction([
    prisma.travelReimbursement.update({
      where: { id: reimbursement.id },
      data: {
        demoUrl: parsed.data.demoUrl,
        demoComment: parsed.data.demoComment || null,
        demoSubmittedAt: new Date(),
        status: "FINAL_REVIEW",
      },
    }),
    prisma.travelStatusEvent.create({
      data: {
        reimbursementId: reimbursement.id,
        actorId: hackerId,
        fromStatus: previousStatus,
        toStatus: "FINAL_REVIEW",
        note,
      },
    }),
  ]);

  revalidatePath("/hacker");
  revalidatePath(`/organizer/travel-reimbursements/${reimbursement.id}`);
  revalidatePath("/organizer/travel-reimbursements");
  return { success: true };
}
