import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { ExpenseForm } from "@/components/expense-form";
import { prisma } from "@/lib/prisma";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function OrganizerPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== "ORGANIZER") {
    redirect("/hacker");
  }

  const expenses = await prisma.expense.findMany({
    where: { organizerId: session.user.id },
    orderBy: { incurredAt: "desc" },
  });
  const totalCents = expenses.reduce(
    (total, expense) => total + expense.amountCents,
    0,
  );
  const currentMonth = new Date();
  const monthTotalCents = expenses
    .filter(
      (expense) =>
        expense.incurredAt.getMonth() === currentMonth.getMonth() &&
        expense.incurredAt.getFullYear() === currentMonth.getFullYear(),
    )
    .reduce((total, expense) => total + expense.amountCents, 0);

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <AppHeader name={session.user.name} role="Organizer" />
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Organizer dashboard</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
              Keep every dollar on track.
            </h1>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="max-w-md text-sm leading-6 text-slate-500">
              A clear view of hackathon spending, from the first venue deposit
              to the final prize.
            </p>
            <Link href="/organizer/users" className="secondary-button">
              <Users size={18} />
              Manage users
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="metric-card metric-card-featured">
            <CircleDollarSign />
            <p>Total spent</p>
            <strong>{currency.format(totalCents / 100)}</strong>
          </article>
          <article className="metric-card">
            <CalendarDays />
            <p>This month</p>
            <strong>{currency.format(monthTotalCents / 100)}</strong>
          </article>
          <article className="metric-card">
            <ReceiptText />
            <p>Transactions</p>
            <strong>{expenses.length}</strong>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="dashboard-card">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="eyebrow">Activity</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Recent expenses
                </h2>
              </div>
              <ReceiptText className="text-slate-400" />
            </div>

            {expenses.length === 0 ? (
              <div className="empty-state">
                <Wallet size={34} />
                <h3>No expenses yet</h3>
                <p>Add your first expense to start tracking the event budget.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {expense.description}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {expense.category} ·{" "}
                        {expense.incurredAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-slate-900">
                      {currency.format(expense.amountCents / 100)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="dashboard-card h-fit">
            <p className="eyebrow">New transaction</p>
            <h2 className="mb-6 mt-1 text-xl font-semibold text-slate-900">
              Add an expense
            </h2>
            <ExpenseForm />
          </aside>
        </section>

      </main>
    </div>
  );
}
