import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, WalletCards } from "lucide-react";

export default function Home() {
  return (
    <div className="landing-shell">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-3 font-semibold">
          <span className="brand-mark brand-mark-small">B</span>
          BudgetHack
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="nav-link">
            Sign in
          </Link>
          <Link href="/register" className="primary-button !h-10 !px-5 text-sm">
            Join now
          </Link>
        </div>
      </nav>

      <main className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28 lg:pt-24">
        <section>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
            <CheckCircle2 size={16} />
            One platform. Every participant.
          </div>
          <h1 className="max-w-3xl text-6xl font-semibold leading-[0.95] tracking-[-0.07em] text-slate-950 sm:text-7xl">
            Build boldly.
            <br />
            <span className="text-violet-600">Budget wisely.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            A focused home for hackathon builders and organizers. Get a
            workspace designed around the role you choose.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="primary-button">
              Create your workspace <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="secondary-button">
              I already have an account
            </Link>
          </div>
        </section>

        <section className="landing-visual" aria-label="Available workspaces">
          <div className="visual-orbit" />
          <article className="role-card role-card-hacker">
            <span className="icon-tile bg-violet-100 text-violet-700">
              <Code2 />
            </span>
            <p className="eyebrow mt-6">For hackers</p>
            <h2>Make the idea real.</h2>
            <p>A clean starting point that keeps the focus on building.</p>
          </article>
          <article className="role-card role-card-organizer">
            <span className="icon-tile bg-amber-100 text-amber-700">
              <WalletCards />
            </span>
            <p className="eyebrow mt-6">For organizers</p>
            <h2>Know where it goes.</h2>
            <p>Track event expenses without losing sight of the big picture.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
