"use server";

import { revalidatePath } from "next/cache";
import { generateInviteToken } from "@/lib/hackathon";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export type InviteActionState = {
  error?: string;
};

/** Generates a single-use hacker invite link. Not tied to any particular
 * email — the admin shares the URL and the first person who completes it
 * consumes it. */
export async function createHackerInvite(): Promise<InviteActionState> {
  const user = await requireOrganizer(["ADMIN"]);

  await prisma.hackerInvite.create({
    data: {
      token: generateInviteToken(),
      createdById: user.id,
      hackathonId: user.hackathonId,
    },
  });

  revalidatePath("/organizer/users");
  return {};
}

export async function revokeHackerInvite(id: string): Promise<InviteActionState> {
  const user = await requireOrganizer(["ADMIN"]);

  await prisma.hackerInvite.deleteMany({
    where: { id, usedAt: null, hackathonId: user.hackathonId },
  });

  revalidatePath("/organizer/users");
  return {};
}
