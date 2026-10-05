import { redirect } from "next/navigation";
import { BudgetList } from "@/components/budget-list";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { getRoleSettings } from "@/lib/role-settings";

export default async function BudgetPage() {
  const organizer = await requireOrganizer();

  const roleSettings = getRoleSettings(organizer.hackathonSettings);
  const roleSetting = roleSettings[organizer.role];
  if (!roleSetting.enabled || !roleSetting.permissions.seeBudget) {
    redirect("/organizer");
  }

  const canEdit = organizer.role === "ADMIN" || organizer.role === "DIRECTOR";
  const canSeePastBudgets = roleSetting.permissions.seePastBudgets;
  // "See budget" only applies to the organizer's own department when their
  // role is tied to one — admins/directors (and roles not linked to a
  // department) keep the event-wide view.
  const scopedDepartmentId = organizer.departmentId;

  const budgets = await prisma.budget.findMany({
    where: { hackathonId: organizer.hackathonId },
    include: {
      categories: {
        select: {
          budgetCents: true,
          category: { select: { departmentId: true } },
        },
      },
      basedOn: { select: { name: true } },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const rows = budgets
    // Viewers without the "See past budgets" permission only ever see the
    // currently active budget in the list.
    .filter((budget) => canSeePastBudgets || budget.isActive)
    .map((budget) => ({
      id: budget.id,
      name: budget.name,
      isActive: budget.isActive,
      totalCents: budget.categories
        .filter(
          (category) =>
            !scopedDepartmentId ||
            category.category?.departmentId === scopedDepartmentId,
        )
        .reduce((total, category) => total + category.budgetCents, 0),
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
          {canEdit
            ? "Keep multiple budget plans, build one from scratch or start by reviewing an existing plan, then activate the one that should drive expense tracking."
            : "Review the budget plan that's driving expense tracking."}
        </p>
      </div>
      <BudgetList budgets={rows} canEdit={canEdit} />
    </main>
  );
}
