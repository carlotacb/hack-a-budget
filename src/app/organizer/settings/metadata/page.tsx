import { MetadataForm } from "@/components/metadata-form";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";

export default async function MetadataPage() {
  await requireOrganizer(["ADMIN"]);

  const [categories, departments] = await Promise.all([
    prisma.category.findMany({
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Configuration</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Categories and departments
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Edit the metadata used by budgets, reports, and expenses.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dashboard-card space-y-5">
          <div>
            <p className="eyebrow">Expense structure</p>
            <h2 className="mt-1 text-xl font-semibold">Categories</h2>
          </div>
          <MetadataForm operation="createCategory" />
          {categories.map((category) => (
            <article
              key={category.id}
              className="space-y-3 rounded-2xl border border-slate-200 p-4"
            >
              <MetadataForm
                operation="updateCategory"
                id={category.id}
                name={category.name}
                active={category.active}
              />
              <div className="space-y-2 border-l-2 border-violet-100 pl-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Subcategories
                </p>
                {category.subcategories.map((subcategory) => (
                  <MetadataForm
                    key={subcategory.id}
                    operation="updateSubcategory"
                    id={subcategory.id}
                    name={subcategory.name}
                    active={subcategory.active}
                  />
                ))}
                <MetadataForm
                  operation="createSubcategory"
                  categoryId={category.id}
                />
              </div>
            </article>
          ))}
        </section>

        <section className="dashboard-card h-fit space-y-5">
          <div>
            <p className="eyebrow">Ownership</p>
            <h2 className="mt-1 text-xl font-semibold">Departments</h2>
          </div>
          <MetadataForm operation="createDepartment" />
          {departments.map((department) => (
            <div
              key={department.id}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <MetadataForm
                operation="updateDepartment"
                id={department.id}
                code={department.code}
                name={department.name}
                active={department.active}
              />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
