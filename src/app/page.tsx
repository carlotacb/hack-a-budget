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
  NotebookPen, Pencil, PencilLine, LogIn, Calendar
} from "lucide-react";

const features = [
  {
    icon: <FolderTree />,
    title: "Departments and categories",
    description:
      "Organize spend the way your event runs: departments, categories and subcategories, all editable without touching a database.",
  },
  {
    icon: <WalletCards />,
    title: "Budget plans & dashboard",
    description:
      "Set a well-defined budget with it's categories and subcategories. Watch where money goes in real time so nothing runs over unnoticed. Compare with past events to see how your budget is performing.",
  },
  {
    icon: <Receipt />,
    title: "Expense tracking and approvals",
    description:
      "Log every expense against a category and department, attach the ticket, and keep an auditable trail from purchase to budget. Add a expense so it can be approved before you buy and expense.",
  },
  {
    icon: <Plane />,
    title: "Travel reimbursements",
    description:
      "For participants that need to travel you event, they will submit their round trip with tickets attached; organizers review, approve and track reimbursement status end to end.",
  },
  {
    icon: <Users />,
    title: "Role-based access",
    description:
      "Participants, organizers, organizer leads, directors and admins each see a workspace scoped to what they need to do. With the permissions defined once register the event.",
  },
  {
    icon: <Calendar />,
    title: "All the information, all the time",
    description:
      "Add the information you want to share with your team or participants. Personalize the workspace with your event's logo and colors, and keep everyone informed with the latest information.",
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
              The operating system behind every event.
            </div>
            <h1 className="max-w-3xl text-6xl font-semibold leading-[0.95] tracking-[-0.07em] text-slate-950 sm:text-7xl">
              Build boldly.
              <br />
              <span className="text-violet-600">Budget wisely.</span>
            </h1>
            <p className="mt-7 max-w-xl text-md leading-8 text-slate-600">
              Maroa is the workspace behind every event, bringing budgets, expenses, travel or expense reimbursements, and event operations into one place. <br />
              Personalize your workspace and share it with your team, so everyone can participate in what matters most: running a successful event.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="primary-button">
                <PencilLine size={16} aria-hidden="true" />
                Register an event
              </Link>
              <Link href="/login" className="secondary-button">
                <LogIn size={16} aria-hidden="true" />
                Enter my account
              </Link>
            </div>
          </section>

          <section className="landing-visual" aria-label="Available workspaces">
            <div className="visual-orbit" />
            <article className="role-card role-card-hacker">
              <p className="eyebrow mt-6">For participants</p>
              <h2>Ask, check, relax</h2>
              <p>Check payments, reimbursements and all the information for the event.</p>
            </article>

            <article className="role-card role-card-organizer">
              <p className="eyebrow mt-6">For organizers</p>
              <h2>Plan the best you can</h2>
              <p>
                With different roles, help your event to become a blast! Having the information you need to make the best decisions for your event is key to success.
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
            See what Moroa does
            <ChevronDown className="landing-scroll-cue" size={22} aria-hidden="true" />
          </a>
        </div>
      </div>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">What Moroa does</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Everything a event&apos;s needs
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

      {/*<section className="border-t border-slate-200 bg-white px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Looking inside</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Some of Moroa in action
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
      </section>*/}
    </div>
  );
}
