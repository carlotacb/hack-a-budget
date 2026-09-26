import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BudgetPlanForm } from "@/components/budget-form";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export default async function BudgetPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrganizer(["ADMIN", "DIRECTOR"]);
  const { id } = await params;

  const budget = await prisma.budget.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          subcategories: { orderBy: { name: "asc" } },
        },
        orderBy: [{ isUnexpected: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!budget) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <Link
          href="/organizer/budget"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700"
        >
          <ArrowLeft size={16} />
          Budgets
        </Link>
        <p className="eyebrow">Planning</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          {budget.name}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {budget.isActive
            ? "This budget is active and drives expense tracking."
            : "This budget is a draft. Activate it from the budgets list once it's ready."}
        </p>
      </div>
      <section className="dashboard-card">
        <BudgetPlanForm budgetId={budget.id} categories={budget.categories} />
      </section>
    </main>
  );
}
