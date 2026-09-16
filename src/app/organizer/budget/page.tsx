import { BudgetForm } from "@/components/budget-form";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export default async function BudgetPage() {
  await requireOrganizer(["ADMIN", "DIRECTOR"]);

  const categories = await prisma.category.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      budgetCents: true,
      subcategories: {
        where: { active: true },
        select: { id: true, name: true, budgetCents: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Planning</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Budget
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Set the event budget by category and refine it with subcategory
          allocations.
        </p>
      </div>
      <section className="dashboard-card">
        <BudgetForm categories={categories} />
      </section>
    </main>
  );
}
