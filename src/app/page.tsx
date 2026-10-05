import Image from "next/image";
import Link from "next/link";
import { LandingNav } from "@/components/landing-nav";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
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

const screenshots = [
  {
    src: "/screenshots/dashboard.png",
    width: 1440,
    height: 760,
    alt: "Organizer dashboard showing total spent, total budget, and spend by category and department",
    title: "See finances at a glance",
    description:
      "Total spent, budget used, and where money is going, per category and per department.",
  },
  {
    src: "/screenshots/expenses.png",
    width: 1440,
    height: 420,
    alt: "Expense list with description, category, date, amount and actions",
    title: "Track every expense",
    description:
      "Log expenses with a ticket attached, and see them all in one list.",
  },
  {
    src: "/screenshots/budget.png",
    width: 1440,
    height: 820,
    alt: "Budget page with multiple budget plans and the active one highlighted",
    title: "Plan the budget",
    description:
      "Keep several budget plans, build one from scratch or from an existing one, then activate it.",
  },
  {
    src: "/screenshots/hacker.png",
    width: 1440,
    height: 460,
    alt: "Hacker home page with options to see event information or ask for travel reimbursement",
    title: "A clear home for hackers",
    description:
      "Check event information, or ask for a travel reimbursement, in one click.",
  },
];

export default function Home() {
  return (
    <div>
      <div className="landing-shell">
        <LandingNav />

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
                <Clock size={18} aria-hidden="true" />
                Register a hackathon
              </Link>
              <Link href="/login" className="secondary-button">
                Sign in
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
              <h2>Ask, check, relax.</h2>
              <p>Reimbursements and event info, in one place.</p>
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

        <div className="flex justify-center pb-8">
          <a
            href="#features"
            aria-label="Scroll to features"
            className="flex flex-col items-center gap-1 text-sm font-medium text-slate-500 hover:text-violet-700"
          >
            See what BudgetHack does
            <ChevronDown className="landing-scroll-cue" size={22} aria-hidden="true" />
          </a>
        </div>
      </div>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">What BudgetHack does</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Everything a hackathon&apos;s budget needs
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

      <section className="border-t border-slate-200 bg-slate-50 px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Inside the app</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            A look at the workspace
          </h2>
          <p className="mt-4 text-lg leading-7 text-slate-600">
            Real screens from BudgetHack, for organizers and hackers alike.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-10 sm:grid-cols-2">
          {screenshots.map((screenshot) => (
            <figure key={screenshot.src} className="text-left">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_rgba(51,65,85,0.08)]">
                <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </div>
                <Image
                  src={screenshot.src}
                  alt={screenshot.alt}
                  width={screenshot.width}
                  height={screenshot.height}
                  className="w-full"
                />
              </div>
              <figcaption className="mt-4">
                <p className="font-semibold text-slate-900">
                  {screenshot.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {screenshot.description}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-16 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              Ready to run your event&apos;s budget?
            </h2>
            <p className="mt-2 text-slate-600">
              Register a new hackathon, or sign in to your existing workspace.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="primary-button">
              <Clock size={18} aria-hidden="true" />
              Register a hackathon
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
