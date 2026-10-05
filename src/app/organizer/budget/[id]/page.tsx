import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BudgetPlanForm } from "@/components/budget-form";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { getRoleSettings } from "@/lib/role-settings";

export default async function BudgetPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organizer = await requireOrganizer();

  const roleSettings = getRoleSettings(organizer.hackathonSettings);
  const roleSetting = roleSettings[organizer.role];
  if (!roleSetting.enabled || !roleSetting.permissions.seeBudget) {
    redirect("/organizer");
  }

  const canEdit = organizer.role === "ADMIN" || organizer.role === "DIRECTOR";
  // "See budget" only applies to the organizer's own department when their
  // role is tied to one — admins/directors (and roles not linked to a
  // department) keep the event-wide view.
  const scopedDepartmentId = organizer.departmentId;
  const { hackathonId } = organizer;
  const { id } = await params;

  const [budget, spendBySubcategory, spendByCategory] = await Promise.all([
    prisma.budget.findFirst({
      where: { id, hackathonId },
      include: {
        categories: {
          where: scopedDepartmentId
            ? { category: { departmentId: scopedDepartmentId } }
            : {},
          include: {
            subcategories: {
              include: { subcategory: { select: { active: true } } },
              orderBy: { name: "asc" },
            },
            category: {
              select: {
                department: { select: { name: true, color: true } },
              },
            },
          },
          orderBy: [{ isUnexpected: "asc" }, { name: "asc" }],
        },
      },
    }),
    prisma.expense.groupBy({
      by: ["subcategoryId"],
      _sum: { amountCents: true },
      where: { hackathonId, subcategoryId: { not: null } },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      _sum: { amountCents: true },
      where: { hackathonId, categoryId: { not: null } },
    }),
  ]);

  if (!budget) {
    notFound();
  }

  const canSeePastBudgets = roleSetting.permissions.seePastBudgets;
  if (!canEdit && !canSeePastBudgets && !budget.isActive) {
    notFound();
  }

  const spentBySubcategoryId = new Map(
    spendBySubcategory.map((row) => [
      row.subcategoryId as string,
      row._sum.amountCents ?? 0,
    ]),
  );
  const spentByCategoryId = new Map(
    spendByCategory.map((row) => [
      row.categoryId as string,
      row._sum.amountCents ?? 0,
    ]),
  );

  const categories = budget.categories.map((category) => ({
    ...category,
    department: category.category?.department ?? null,
    spentCents: category.categoryId
      ? (spentByCategoryId.get(category.categoryId) ?? 0)
      : 0,
    subcategories: category.subcategories
      // A subcategory that was deactivated after being added to this
      // budget plan should no longer clutter the editor.
      .filter((subcategory) => subcategory.subcategory?.active !== false)
      .map((subcategory) => ({
        ...subcategory,
        spentCents: subcategory.subcategoryId
          ? (spentBySubcategoryId.get(subcategory.subcategoryId) ?? 0)
          : 0,
      })),
  }));

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
        <BudgetPlanForm
          budgetId={budget.id}
          categories={categories}
          readOnly={!canEdit}
        />
      </section>
    </main>
  );
}
