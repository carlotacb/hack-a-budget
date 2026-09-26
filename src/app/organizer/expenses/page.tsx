import { FileText } from "lucide-react";
import { AddExpenseButton } from "@/components/add-expense-button";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { EditExpenseButton } from "@/components/edit-expense-button";
import { ExpenseInfoButton } from "@/components/expense-info-button";
import { TicketViewerButton } from "@/components/ticket-viewer-button";
import { ensureGeneralDepartment } from "@/lib/general-department";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/travel";

export default async function ExpenseListPage() {
  const user = await requireOrganizer(["ADMIN", "DIRECTOR", "ORGANIZER"]);
  const isAdmin = user.role === "ADMIN";

  const generalDepartment = isAdmin ? await ensureGeneralDepartment() : null;

  const [expenses, categories, activeBudget, spendBySubcategory, spendByCategory] =
    await Promise.all([
      prisma.expense.findMany({
        include: { category: true, subcategory: true, department: true },
        orderBy: { incurredAt: "desc" },
      }),
      isAdmin
        ? prisma.category.findMany({
            where: { active: true },
            select: {
              id: true,
              name: true,
              subcategories: {
                where: { active: true },
                select: {
                  id: true,
                  name: true,
                  department: { select: { name: true } },
                },
                orderBy: { name: "asc" },
              },
            },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      prisma.budget.findFirst({
        where: { isActive: true },
        include: {
          categories: {
            include: { subcategories: true },
          },
        },
      }),
      prisma.expense.groupBy({
        by: ["subcategoryId"],
        _sum: { amountCents: true },
        where: { subcategoryId: { not: null } },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        _sum: { amountCents: true },
        where: { categoryId: { not: null } },
      }),
    ]);

  const formCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    departmentName: generalDepartment?.name ?? "General",
    subcategories: category.subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      departmentName: subcategory.department.name,
    })),
  }));

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

  const budgetCentsByCategoryId = new Map(
    activeBudget?.categories
      .filter((category) => category.categoryId)
      .map((category) => [category.categoryId as string, category.budgetCents]) ??
      [],
  );
  const budgetCentsBySubcategoryId = new Map(
    activeBudget?.categories
      .flatMap((category) => category.subcategories)
      .filter((subcategory) => subcategory.subcategoryId)
      .map((subcategory) => [
        subcategory.subcategoryId as string,
        subcategory.budgetCents,
      ]) ?? [],
  );

  const expenseDetails = expenses.map((expense) => {
    const scopeBudgetCents = expense.subcategoryId
      ? (budgetCentsBySubcategoryId.get(expense.subcategoryId) ?? null)
      : expense.categoryId
        ? (budgetCentsByCategoryId.get(expense.categoryId) ?? null)
        : null;
    const scopeSpentCents = expense.subcategoryId
      ? (spentBySubcategoryId.get(expense.subcategoryId) ?? 0)
      : expense.categoryId
        ? (spentByCategoryId.get(expense.categoryId) ?? 0)
        : 0;
    const percentOfBudget =
      scopeBudgetCents && scopeBudgetCents > 0
        ? (scopeSpentCents / scopeBudgetCents) * 100
        : null;

    return {
      expense,
      relatedBudgetName: activeBudget?.name ?? null,
      scopeBudgetCents,
      scopeSpentCents,
      percentOfBudget,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Expenses</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Expense list
          </h1>
        </div>
        {isAdmin &&
          (activeBudget ? (
            <AddExpenseButton categories={formCategories} />
          ) : (
            <p className="max-w-xs text-right text-sm text-slate-500">
              Activate a budget before adding expenses.
            </p>
          ))}
      </div>

      <section className="dashboard-card overflow-x-auto">
        {expenses.length === 0 ? (
          <div className="empty-state">
            <FileText size={34} />
            <h2>No expenses yet</h2>
            <p>Add the first expense to begin tracking event spend.</p>
          </div>
        ) : (
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseDetails.map(
                ({ expense, relatedBudgetName, scopeBudgetCents, scopeSpentCents, percentOfBudget }) => (
                  <tr key={expense.id}>
                    <td className="py-4 pr-4 font-medium text-slate-900">
                      {expense.description}
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        {expense.category?.name ?? expense.categoryLabel}
                        {expense.department && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {expense.department.name}
                          </span>
                        )}
                      </span>
                      {expense.subcategory && (
                        <span className="block text-xs text-slate-400">
                          {expense.subcategory.name}
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600">
                      {expense.incurredAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-4 text-right font-semibold text-slate-900">
                      {formatMoney(expense.amountCents)}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <ExpenseInfoButton
                          expense={{
                            description: expense.description,
                            vendor: expense.vendor,
                            categoryName: expense.category?.name ?? expense.categoryLabel,
                            subcategoryName: expense.subcategory?.name ?? null,
                            departmentName: expense.department?.name ?? null,
                            incurredAt: expense.incurredAt.toISOString(),
                            amountCents: expense.amountCents,
                          }}
                          relatedBudgetName={relatedBudgetName}
                          scopeBudgetCents={scopeBudgetCents}
                          scopeSpentCents={scopeSpentCents}
                          percentOfBudget={percentOfBudget}
                        />
                        {expense.ticketPath && (
                          <TicketViewerButton
                            ticketPath={`/api/tickets/expense/${expense.id}`}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                            label="Ticket"
                          />
                        )}
                        {isAdmin && (
                          <>
                            <EditExpenseButton
                              categories={formCategories}
                              expense={{
                                id: expense.id,
                                description: expense.description,
                                categoryId: expense.categoryId,
                                subcategoryId: expense.subcategoryId,
                                amountCents: expense.amountCents,
                                incurredAt: expense.incurredAt.toISOString(),
                                vendor: expense.vendor,
                              }}
                            />
                            <DeleteExpenseButton
                              id={expense.id}
                              description={expense.description}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
