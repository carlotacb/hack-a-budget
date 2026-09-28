import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  FolderTree,
  Plane,
  Receipt,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

const features = [
  {
    icon: <Receipt />,
    title: "Expense tracking",
    description:
      "Log every expense against a category and department, attach the ticket, and keep an auditable trail from purchase to budget.",
  },
  {
    icon: <WalletCards />,
    title: "Budget plans",
    description:
      "Set a budget per category and subcategory, then watch spend against it in real time so nothing runs over unnoticed.",
  },
  {
    icon: <FolderTree />,
    title: "Departments and categories",
    description:
      "Organize spend the way your event runs: departments, categories and subcategories, all editable without touching a database.",
  },
  {
    icon: <Plane />,
    title: "Travel reimbursements",
    description:
      "Hackers submit their round trip with tickets attached; organizers review, approve and track reimbursement status end to end.",
  },
  {
    icon: <Users />,
    title: "Role-based access",
    description:
      "Hackers, organizers, directors and admins each see a workspace scoped to what they need to do.",
  },
  {
    icon: <ShieldCheck />,
    title: "Built for review",
    description:
      "Every approval, edit and status change is tracked, so the story of where the budget went is never lost.",
  },
];

export default function Home() {
  return (
    <div>
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
            <Link
              href="/register"
              className="primary-button !h-10 !px-5 text-sm"
            >
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
              BudgetHack is where a hackathon tracks its money: expenses,
              budgets and travel reimbursements, in a workspace shaped around
              the role you choose.
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
              <p>
                Track event expenses without losing sight of the big picture.
              </p>
            </article>
          </section>
        </main>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">What BudgetHack does</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Everything a hackathon's budget needs
          </h2>
          <p className="mt-4 text-lg leading-7 text-slate-600">
            From the first ticket to the final reconciliation, one place to
            plan, spend and review.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="dashboard-card">
              <span className="icon-tile bg-violet-100 text-violet-700">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-16 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Ready to run your event's budget?
            </h2>
            <p className="mt-2 text-slate-600">
              Join as a hacker or an organizer and get straight to your
              workspace.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="primary-button">
              Create your workspace <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="secondary-button">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
