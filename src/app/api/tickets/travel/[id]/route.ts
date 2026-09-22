import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/travel";
import { prisma } from "@/lib/prisma";

/**
 * Streams a travel reimbursement ticket from private Blob storage. Only the
 * owning hacker or an Admin/Director reviewer may view it — checked against
 * the actual record, not just the caller's role, so a hacker can't view
 * another hacker's ticket by guessing/reusing a URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id } = await params;
  const reimbursement = await prisma.travelReimbursement.findUnique({
    where: { id },
    select: { ticketPath: true, hackerId: true },
  });

  if (!reimbursement) {
    return new NextResponse("Not found", { status: 404 });
  }

  const isOwner = reimbursement.hackerId === user.id;
  const isReviewer = user.role === "ADMIN" || user.role === "DIRECTOR";

  if (!isOwner && !isReviewer) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blob = await get(reimbursement.ticketPath, { access: "private" }).catch(
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
