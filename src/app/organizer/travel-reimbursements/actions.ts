"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export type TravelReviewState = {
  error?: string;
  success?: boolean;
};

const reviewSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("approve"),
    approvedAmount: z.coerce
      .number()
      .min(0, "Approved amount cannot be negative.")
      .max(1_000_000, "Approved amount is too large."),
    note: z.string().trim().max(2000, "Note is too long.").optional(),
  }),
  z.object({
    operation: z.literal("requestChanges"),
    note: z
      .string()
      .trim()
      .min(1, "A note is required when requesting changes.")
      .max(2000, "Note is too long."),
  }),
  z.object({
    operation: z.literal("reject"),
    note: z
      .string()
      .trim()
      .min(1, "A note is required when rejecting a request.")
      .max(2000, "Note is too long."),
  }),
]);

export async function reviewTravelRequest(
  reimbursementId: string,
  _state: TravelReviewState,
  formData: FormData,
): Promise<TravelReviewState> {
  const reviewerId = await getOrganizerId(["ADMIN", "DIRECTOR"]);

  if (!reviewerId) {
    return { error: "Only admins and directors can review travel requests." };
  }

  const id = z.string().cuid().safeParse(reimbursementId);
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));

  if (!id.success || !parsed.success) {
    return {
      error: parsed.success
        ? "Invalid reimbursement."
        : parsed.error.issues[0].message,
    };
  }

  const reimbursement = await prisma.travelReimbursement.findUnique({
    where: { id: reimbursementId },
  });

  if (!reimbursement) {
    return { error: "Travel reimbursement not found." };
  }
  if (reimbursement.status !== "PENDING_REVIEW") {
    return { error: "This request is no longer pending review." };
  }

  const now = new Date();
  const data = parsed.data;
  const toStatus =
    data.operation === "approve"
      ? "APPROVED"
      : data.operation === "requestChanges"
        ? "CHANGES_REQUESTED"
        : "REJECTED";

  if (
    data.operation === "approve" &&
    Math.round(data.approvedAmount * 100) > reimbursement.totalPriceCents
  ) {
    return { error: "Approved amount cannot exceed the submitted total." };
  }

  const note = data.note || null;

  await prisma.$transaction([
    prisma.travelReimbursement.update({
      where: { id: reimbursement.id },
      data: {
        status: toStatus,
        organizerNote: note,
        approvedAmountCents:
          data.operation === "approve"
            ? Math.round(data.approvedAmount * 100)
            : null,
        approvedAt: data.operation === "approve" ? now : null,
        initialReviewerId: reviewerId,
        initialReviewedAt: now,
      },
    }),
    prisma.travelStatusEvent.create({
      data: {
        reimbursementId: reimbursement.id,
        actorId: reviewerId,
        fromStatus: reimbursement.status,
        toStatus,
        note,
      },
    }),
  ]);

  revalidatePath("/hacker");
  revalidatePath("/organizer/travel-reimbursements");
  revalidatePath(`/organizer/travel-reimbursements/${reimbursement.id}`);
  return { success: true };
}

export async function saveRequirementChecks(
  reimbursementId: string,
  _state: TravelReviewState,
  formData: FormData,
): Promise<TravelReviewState> {
  const reviewerId = await getOrganizerId(["ADMIN", "DIRECTOR"]);

  if (!reviewerId) {
    return { error: "Only admins and directors can update final checks." };
  }
  if (!z.string().cuid().safeParse(reimbursementId).success) {
    return { error: "Invalid reimbursement." };
  }

  const [reimbursement, requirements] = await Promise.all([
    prisma.travelReimbursement.findUnique({
      where: { id: reimbursementId },
      select: { status: true },
    }),
    prisma.travelFinalRequirement.findMany({
      where: { active: true },
      select: { id: true },
    }),
  ]);

  if (!reimbursement) {
    return { error: "Travel reimbursement not found." };
  }
  if (reimbursement.status !== "FINAL_REVIEW") {
    return { error: "Checklist updates require a submitted demo proof." };
  }

  const now = new Date();

  await prisma.$transaction(
    requirements.map((requirement) => {
      const checked = formData.get(`requirement:${requirement.id}`) === "on";
      return prisma.travelRequirementCheck.upsert({
        where: {
          reimbursementId_requirementId: {
            reimbursementId,
            requirementId: requirement.id,
          },
        },
        update: {
          checked,
          checkedAt: checked ? now : null,
          checkedById: checked ? reviewerId : null,
        },
        create: {
          reimbursementId,
          requirementId: requirement.id,
          checked,
          checkedAt: checked ? now : null,
          checkedById: checked ? reviewerId : null,
        },
      });
    }),
  );

  revalidatePath(`/organizer/travel-reimbursements/${reimbursementId}`);
  return { success: true };
}

export async function finalApproveTravel(
  reimbursementId: string,
  _state: TravelReviewState,
  _formData: FormData,
): Promise<TravelReviewState> {
  void _state;
  void _formData;
  const reviewerId = await getOrganizerId(["ADMIN", "DIRECTOR"]);

  if (!reviewerId) {
    return { error: "Only admins and directors can final-approve travel." };
  }
  if (!z.string().cuid().safeParse(reimbursementId).success) {
    return { error: "Invalid reimbursement." };
  }

  const [reimbursement, requirements] = await Promise.all([
    prisma.travelReimbursement.findUnique({
      where: { id: reimbursementId },
      select: { id: true, status: true, demoUrl: true },
    }),
    prisma.travelFinalRequirement.findMany({
      where: { active: true },
      select: {
        id: true,
        checks: {
          where: { reimbursementId },
          select: { checked: true },
        },
      },
    }),
  ]);

  if (
    !reimbursement ||
    reimbursement.status !== "FINAL_REVIEW" ||
    !reimbursement.demoUrl
  ) {
    return { error: "Final approval requires a submitted demo proof." };
  }
  if (requirements.some((requirement) => !requirement.checks[0]?.checked)) {
    return { error: "Complete every active final requirement first." };
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.travelReimbursement.update({
      where: { id: reimbursement.id },
      data: {
        status: "FINAL_APPROVED",
        finalReviewerId: reviewerId,
        finalApprovedAt: now,
      },
    }),
    prisma.travelStatusEvent.create({
      data: {
        reimbursementId: reimbursement.id,
        actorId: reviewerId,
        fromStatus: "FINAL_REVIEW",
        toStatus: "FINAL_APPROVED",
        note: "All active final requirements approved.",
      },
    }),
  ]);

  revalidatePath("/hacker");
  revalidatePath("/organizer/travel-reimbursements");
  revalidatePath(`/organizer/travel-reimbursements/${reimbursement.id}`);
  return { success: true };
}
