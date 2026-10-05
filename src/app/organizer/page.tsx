import Link from "next/link";
import {
  Banknote,
  CircleDollarSign,
  List,
  ReceiptText,
} from "lucide-react";
import { BudgetSelector } from "@/components/budget-selector";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export default async function OrganizerPage({
  searchParams,
}: {
  searchParams: Promise<{ budgetId?: string }>;
}) {
  const organizer = await requireOrganizer([
    "ADMIN",
    "DIRECTOR",
    "ORGANIZER",
    "ORGANIZER_LEAD",
  ]);
  const hackathonId = organizer.hackathonId;
  // Organizers/Organizer Leads tied to a department only ever see that
  // department's slice of the event: their own budget, their own
  // categories, and their own recent expenses. Admins/Directors (and
  // organizers not linked to a department) keep the event-wide view.
  const scopedDepartmentId = organizer.departmentId;

  const { budgetId: requestedBudgetId } = await searchParams;

  const budgets = await prisma.budget.findMany({
    where: { hackathonId },
    select: { id: true, name: true, isActive: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  // Default to the active budget — or the most recent one if nothing is
  // active — but let organizers pick any past budget to see how it went.
  const selectedBudgetId =
    (requestedBudgetId &&
      budgets.find((budget) => budget.id === requestedBudgetId)?.id) ||
    budgets.find((budget) => budget.isActive)?.id ||
    budgets[0]?.id ||
    null;

  const [budgetCategories, expenses, departments] = await Promise.all([
    selectedBudgetId
      ? prisma.budgetCategory.findMany({
          where: {
            budgetId: selectedBudgetId,
            ...(scopedDepartmentId
              ? { category: { departmentId: scopedDepartmentId } }
              : {}),
          },
          select: { id: true, name: true, budgetCents: true, categoryId: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    selectedBudgetId
      ? prisma.expense.findMany({
          where: {
            hackathonId,
            budgetId: selectedBudgetId,
            ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}),
          },
          include: { category: true, department: true },
          orderBy: { incurredAt: "desc" },
        })
      : Promise.resolve([]),
    scopedDepartmentId
      ? Promise.resolve([])
      : prisma.department.findMany({
          where: { hackathonId, active: true },
          select: { id: true, name: true, color: true },
          orderBy: { name: "asc" },
        }),
  ]);

  const spentByCategoryId = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.categoryId) continue;
    spentByCategoryId.set(
      expense.categoryId,
      (spentByCategoryId.get(expense.categoryId) ?? 0) + expense.amountCents,
    );
  }

  const spentByDepartmentId = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.departmentId) continue;
    spentByDepartmentId.set(
      expense.departmentId,
      (spentByDepartmentId.get(expense.departmentId) ?? 0) + expense.amountCents,
    );
  }

  const totalSpent = expenses.reduce(
    (total, expense) => total + expense.amountCents,
    0,
  );
  const totalBudget = budgetCategories.reduce(
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
            {scopedDepartmentId
              ? `${organizer.departmentName ?? "Your department"} finances at a glance.`
              : "Event finances at a glance."}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            {scopedDepartmentId
              ? "Track your department's spend, budget utilization, and recent activity."
              : "Track total spend, budget utilization, and where event money is going."}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {selectedBudgetId && (
            <BudgetSelector budgets={budgets} selectedBudgetId={selectedBudgetId} />
          )}
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

      <section
        className={`mt-6 grid gap-6 ${scopedDepartmentId ? "" : "lg:grid-cols-2"}`}
      >
        <article className="dashboard-card">
          <p className="eyebrow">Budget utilization</p>
          <h2 className="mb-6 mt-1 text-xl font-semibold text-slate-900">
            Spend by category
          </h2>
          <div className="space-y-5">
            {budgetCategories.map((category) => {
              const spent = category.categoryId
                ? (spentByCategoryId.get(category.categoryId) ?? 0)
                : 0;
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
            {budgetCategories.length === 0 && (
              <p className="text-sm text-slate-500">
                No budget categories for this budget.
              </p>
            )}
          </div>
        </article>

        {!scopedDepartmentId && (
          <article className="dashboard-card">
            <p className="eyebrow">Ownership</p>
            <h2 className="mb-6 mt-1 text-xl font-semibold text-slate-900">
              Spend by department
            </h2>
            <div className="space-y-5">
              {departments.map((department) => {
                const spent = spentByDepartmentId.get(department.id) ?? 0;
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
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: department.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {unassignedDepartmentSpend > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-800">
                      Unassigned
                    </span>
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
        )}
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

