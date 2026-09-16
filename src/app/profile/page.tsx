import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { ProfileForm } from "@/components/profile-form";
import { roleLabels } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      gender: true,
      city: true,
      major: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppHeader name={user.name} role={roleLabels[user.role]} />
      <main className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <div className="mb-8">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <UserRound />
          </div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Edit your profile
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Keep your participant information accurate and up to date.
          </p>
        </div>

        <section className="dashboard-card">
          <ProfileForm user={user} />
        </section>
      </main>
    </div>
  );
}
