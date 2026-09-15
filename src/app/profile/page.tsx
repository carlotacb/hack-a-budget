import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { ProfileForm } from "@/components/profile-form";
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

  const role = user.role === "ORGANIZER" ? "Organizer" : "Hacker";

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppHeader name={user.name} role={role} />
      <main className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
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
