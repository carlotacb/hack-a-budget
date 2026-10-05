import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** Generates a random, URL-safe token for a single-use hacker invite link. */
export function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

/** A hackathon by id. Each hackathon is an isolated space: its own budget,
 * expenses, travel flow and metadata. A user can belong to several. */
export async function getHackathonById(hackathonId: string) {
  return prisma.hackathon.findUnique({ where: { id: hackathonId } });
}

export async function isTravelReimbursementEnabled(hackathonId: string) {
  const hackathon = await getHackathonById(hackathonId);
  return hackathon?.travelReimbursementEnabled ?? false;
}
