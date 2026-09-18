import Link from "next/link";
import {
  Banknote,
  CircleDollarSign,
  List,
  ReceiptText,
} from "lucide-react";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export default async function OrganizerPage() {
  await requireOrganizer(["ADMIN", "DIRECTOR", "ORGANIZER"]);
  const [expenses, categories, departments] = await Promise.all([
    prisma.expense.findMany({
      include: { category: true, department: true },
      orderBy: { incurredAt: "desc" },
    }),
    prisma.category.findMany({
      where: { active: true },
      include: { expenses: { select: { amountCents: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { active: true },
      include: { expenses: { select: { amountCents: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalSpent = expenses.reduce(
    (total, expense) => total + expense.amountCents,
    0,
  );
  const totalBudget = categories.reduce(
    (total, category) => total + category.budgetCents,
    0,
  );
  const utilization = percentage(totalSpent, totalBudget);
  const unassignedDepartmentSpend = expenses
    .filter((expense) => !expense.departmentId)
    .reduce((total, expense) => total + expense.amountCents, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Organizer dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Event finances at a glance.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Track total spend, budget utilization, and where event money is
            going.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/organizer/expenses" className="secondary-button">
            <List size={18} />
            Expenses
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="metric-card metric-card-featured">
          <CircleDollarSign />
          <p>Total spent</p>
          <strong>{currency.format(totalSpent / 100)}</strong>
        </article>
        <article className="metric-card">
          <Banknote />
          <p>Total budget</p>
          <strong>{currency.format(totalBudget / 100)}</strong>
        </article>
        <article className="metric-card">
          <ReceiptText />
          <p>Budget used</p>
          <strong>{utilization}%</strong>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="dashboard-card">
          <p className="eyebrow">Budget utilization</p>
          <h2 className="mb-6 mt-1 text-xl font-semibold text-slate-900">
            Spend by category
          </h2>
          <div className="space-y-5">
            {categories.map((category) => {
              const spent = category.expenses.reduce(
                (total, expense) => total + expense.amountCents,
                0,
              );
              const used = percentage(spent, category.budgetCents);

              return (
                <div key={category.id}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-800">
                      {category.name}
                    </span>
                    <span className="text-slate-500">
                      {currency.format(spent / 100)} /{" "}
                      {currency.format(category.budgetCents / 100)} · {used}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-600"
                      style={{ width: `${Math.min(used, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="dashboard-card">
          <p className="eyebrow">Ownership</p>
          <h2 className="mb-6 mt-1 text-xl font-semibold text-slate-900">
            Spend by department
          </h2>
          <div className="space-y-5">
            {departments.map((department) => {
              const spent = department.expenses.reduce(
                (total, expense) => total + expense.amountCents,
                0,
              );
              const share = percentage(spent, totalSpent);

              return (
                <div key={department.id}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-800">
                      {department.name}
                    </span>
                    <span className="text-slate-500">
                      {currency.format(spent / 100)} · {share}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {unassignedDepartmentSpend > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-slate-800">Unassigned</span>
                  <span className="text-slate-500">
                    {currency.format(unassignedDepartmentSpend / 100)} ·{" "}
                    {percentage(unassignedDepartmentSpend, totalSpent)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-400"
                    style={{
                      width: `${percentage(unassignedDepartmentSpend, totalSpent)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-card mt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Activity</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Recent expenses
            </h2>
          </div>
          <Link
            href="/organizer/expenses"
            className="text-sm font-semibold text-violet-700"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {expenses.slice(0, 5).map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {expense.description}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {expense.category?.name ?? expense.categoryLabel} ·{" "}
                  {expense.department?.name ?? "No department"} ·{" "}
                  {expense.incurredAt.toLocaleDateString("en-GB")}
                </p>
              </div>
              <strong>{currency.format(expense.amountCents / 100)}</strong>
            </div>
          ))}
          {expenses.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              No expenses have been recorded.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
