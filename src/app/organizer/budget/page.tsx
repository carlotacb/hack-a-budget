import { BudgetList } from "@/components/budget-list";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export default async function BudgetPage() {
  await requireOrganizer(["ADMIN", "DIRECTOR"]);

  const budgets = await prisma.budget.findMany({
    include: {
      categories: { select: { budgetCents: true } },
      basedOn: { select: { name: true } },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const rows = budgets.map((budget) => ({
    id: budget.id,
    name: budget.name,
    isActive: budget.isActive,
    totalCents: budget.categories.reduce(
      (total, category) => total + category.budgetCents,
      0,
    ),
    createdAt: budget.createdAt.toISOString(),
    basedOnName: budget.basedOn?.name ?? null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Planning</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Budget
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Keep multiple budget plans, build one from scratch or start by
          reviewing an existing plan, then activate the one that should drive
          expense tracking.
        </p>
      </div>
      <BudgetList budgets={rows} />
    </main>
  );
}
