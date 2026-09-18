import { FileText } from "lucide-react";
import { AddExpenseButton } from "@/components/add-expense-button";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function ExpenseListPage() {
  const user = await requireOrganizer(["ADMIN", "DIRECTOR", "ORGANIZER"]);
  const [expenses, categories, departments] = await Promise.all([
    prisma.expense.findMany({
      include: { category: true, subcategory: true, department: true },
      orderBy: { incurredAt: "desc" },
    }),
    user.role === "ADMIN"
      ? prisma.category.findMany({
          where: { active: true },
          select: {
            id: true,
            name: true,
            subcategories: {
              where: { active: true },
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    user.role === "ADMIN"
      ? prisma.department.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Expenses</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Expense list
          </h1>
        </div>
        {user.role === "ADMIN" && (
          <AddExpenseButton categories={categories} departments={departments} />
        )}
      </div>

      <section className="dashboard-card overflow-x-auto">
        {expenses.length === 0 ? (
          <div className="empty-state">
            <FileText size={34} />
            <h2>No expenses yet</h2>
            <p>Add the first expense to begin tracking event spend.</p>
          </div>
        ) : (
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Vendor</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="py-4 pr-4 font-medium text-slate-900">
                    {expense.description}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {expense.category?.name ?? expense.categoryLabel}
                    {expense.subcategory && (
                      <span className="block text-xs text-slate-400">
                        {expense.subcategory.name}
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {expense.department?.name ?? "Not assigned"}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {expense.vendor ?? "Not provided"}
                  </td>
                  <td className="py-4 pr-4 text-sm text-slate-600">
                    {expense.incurredAt.toLocaleDateString("en-GB")}
                  </td>
                  <td className="py-4 text-right font-semibold text-slate-900">
                    {currency.format(expense.amountCents / 100)}
                  </td>
                  <td className="py-4 text-right">
                    {expense.ticketPath ? (
                      <a
                        href={expense.ticketPath}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-violet-700 hover:text-violet-900"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
