import { redirect } from "next/navigation";
import { Code2, Rocket, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { dashboardForRole } from "@/lib/organizer";

export default async function HackerPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "HACKER") {
    redirect(dashboardForRole(session.user.role));
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppHeader name={session.user.name} role="Hacker" />
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-20">
        <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-16 text-white shadow-2xl shadow-violet-200 md:px-16">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-violet-200">
              <Sparkles size={16} />
              Hacker workspace
            </div>
            <p className="eyebrow !text-violet-300">You are in</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-7xl">
              Hello, world.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Welcome to the hackathon, {session.user.name?.split(" ")[0] ?? "hacker"}.
              Your workspace is ready for the next big idea.
            </p>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            <div className="glass-panel">
              <Code2 className="text-violet-300" />
              <div>
                <p className="font-medium">Start building</p>
                <p className="mt-1 text-sm text-slate-400">
                  Turn your idea into a working prototype.
                </p>
              </div>
            </div>
            <div className="glass-panel">
              <Rocket className="text-amber-300" />
              <div>
                <p className="font-medium">Ship something bold</p>
                <p className="mt-1 text-sm text-slate-400">
                  Make it useful, memorable, and yours.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
