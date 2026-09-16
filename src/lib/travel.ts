import { redirect } from "next/navigation";
import type {
  Role,
  TravelReimbursementStatus,
  TransportMode,
} from "@prisma/client";
import { auth } from "@/auth";
import { dashboardForRole } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export const travelReviewRoles = [
  "ADMIN",
  "DIRECTOR",
] as const satisfies readonly Role[];

export const travelStatusLabels = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  CHANGES_REQUESTED: "Changes requested",
  REJECTED: "Rejected",
  APPROVED: "Travel approved",
  FINAL_REVIEW: "Final review",
  FINAL_APPROVED: "Final approved",
} as const satisfies Record<TravelReimbursementStatus, string>;

export const travelStatusClasses = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
  REJECTED: "bg-red-100 text-red-700",
  APPROVED: "bg-blue-100 text-blue-800",
  FINAL_REVIEW: "bg-violet-100 text-violet-800",
  FINAL_APPROVED: "bg-emerald-100 text-emerald-800",
} as const satisfies Record<TravelReimbursementStatus, string>;

export const transportLabels = {
  BUS: "Bus",
  TRAIN: "Train",
  AIRPLANE: "Airplane",
} as const satisfies Record<TransportMode, string>;

export const editableTravelStatuses: readonly TravelReimbursementStatus[] = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "REJECTED",
];

export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function requireHacker() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (user.role !== "HACKER") {
    redirect(dashboardForRole(user.role));
  }

  return user;
}

export async function getHackerId() {
  const user = await getCurrentUser();
  return user?.role === "HACKER" ? user.id : null;
}

export function parseLocalDateTime(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
  ].map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function formatLocalDateTime(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const parts = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
    String(value.getHours()).padStart(2, "0"),
    String(value.getMinutes()).padStart(2, "0"),
  ];

  return `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}`;
}

export function formatEventDateTime(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Not configured";
}

export function formatMoney(
  cents: number | null | undefined,
  currencyCode = "EUR",
) {
  if (cents === null || cents === undefined) {
    return "Not set";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).format(cents / 100);
}
