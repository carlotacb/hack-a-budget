import { ExpenseForm } from "@/components/expense-form";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export default async function NewExpensePage() {
  await requireOrganizer(["ADMIN"]);

  const [categories, departments] = await Promise.all([
    prisma.category.findMany({
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
    }),
    prisma.department.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Expenses</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Add new expense
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Record the purchase details and attach the supporting ticket.
        </p>
      </div>
      <section className="dashboard-card">
        <ExpenseForm categories={categories} departments={departments} />
      </section>
    </main>
  );
}
