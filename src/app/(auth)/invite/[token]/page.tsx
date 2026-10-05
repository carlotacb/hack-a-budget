import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InviteRegisterForm } from "@/components/invite-register-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.hackerInvite.findUnique({
    where: { token },
    include: { hackathon: { select: { name: true } } },
  });

  if (!invite || invite.usedAt) {
    return (
      <div className="auth-card">
        <p className="eyebrow">Invite link</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
          This invite link is invalid or has already been used
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Ask an organizer for a new invite link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block font-semibold text-violet-700 hover:text-violet-900"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <InviteRegisterForm
      token={token}
      hackathonName={invite.hackathon.name}
      isAuthenticated={Boolean(session?.user)}
    />
  );
}
