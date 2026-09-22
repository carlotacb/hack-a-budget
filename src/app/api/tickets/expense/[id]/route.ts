import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getOrganizerId } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

/**
 * Streams an expense ticket from private Blob storage. Access is checked
 * per-request (same roles as the expense list page) rather than relying on
 * the blob URL alone, since the store no longer serves files publicly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const organizerId = await getOrganizerId(["ADMIN", "DIRECTOR", "ORGANIZER"]);

  if (!organizerId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { ticketPath: true },
  });

  if (!expense?.ticketPath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blob = await get(expense.ticketPath, { access: "private" }).catch(
    () => null,
  );

  if (!blob?.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
