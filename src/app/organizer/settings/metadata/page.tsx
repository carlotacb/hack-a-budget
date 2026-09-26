import { CategoriesBulkForm } from "@/components/categories-bulk-form";
import { DepartmentsBulkForm } from "@/components/departments-bulk-form";
import { MetadataForm } from "@/components/metadata-form";
import { MetadataTabs } from "@/components/metadata-tabs";
import {
  TravelMessageTemplateForm,
  TravelRequirementForm,
  TravelSettingsForm,
} from "@/components/travel-metadata-forms";
import { ensureUnexpectedCategory } from "@/app/organizer/budget/actions";
import { requireOrganizer } from "@/lib/organizer";
import { prisma } from "@/lib/prisma";
import { formatLocalDateTime } from "@/lib/travel";

export default async function MetadataPage() {
  await requireOrganizer(["ADMIN"]);

  // General must always exist, even on a brand-new database.
  await prisma.department.upsert({
    where: { code: "general" },
    update: {},
    create: { code: "general", name: "General" },
  });
  // Unexpected expenses must always exist too, so it's always visible here.
  await ensureUnexpectedCategory();

  const [
    categories,
    departments,
    travelSettings,
    travelRequirements,
    travelMessageTemplates,
  ] = await Promise.all([
    prisma.category.findMany({
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.travelEventSettings.findUnique({ where: { id: "event" } }),
    prisma.travelFinalRequirement.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.travelMessageTemplate.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
  ]);

  const travelTab = (
    <section className="dashboard-card grid gap-6 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Travel configuration</p>
        <h2 className="mt-1 text-xl font-semibold">Event and reimbursement</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Datetimes are entered and displayed in the event&apos;s local time.
          The deployment server must use the same timezone.
        </p>
        <div className="mt-5">
          <TravelSettingsForm
            hackathonStartAt={formatLocalDateTime(
              travelSettings?.hackathonStartAt,
            )}
            reimbursementInstructions={
              travelSettings?.reimbursementInstructions ??
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            }
            finalReviewInstructions={
              travelSettings?.finalReviewInstructions ??
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
            }
          />
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="eyebrow">Final approval</p>
          <h2 className="mt-1 text-xl font-semibold">Requirements</h2>
        </div>
        <TravelRequirementForm />
        {travelRequirements.map((requirement) => (
          <div
            key={`${requirement.id}:${requirement.updatedAt.getTime()}`}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <TravelRequirementForm
              id={requirement.id}
              name={requirement.name}
              active={requirement.active}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div>
          <p className="eyebrow">Initial review</p>
          <h2 className="mt-1 text-xl font-semibold">Message templates</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Reusable messages organizers can apply to the reviewer note when
            rejecting or requesting changes on a travel reimbursement.
          </p>
        </div>
        <TravelMessageTemplateForm />
        <div className="grid gap-4 lg:grid-cols-2">
          {travelMessageTemplates.map((template) => (
            <div
              key={`${template.id}:${template.updatedAt.getTime()}`}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <TravelMessageTemplateForm
                id={template.id}
                name={template.name}
                message={template.message}
                active={template.active}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const expensesTab = (
    <section className="dashboard-card space-y-5">
      <div>
        <p className="eyebrow">Expense structure</p>
        <h2 className="mt-1 text-xl font-semibold">Categories</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Each subcategory belongs to one department, used to attribute
          expenses.
        </p>
      </div>
      <MetadataForm operation="createCategory" />
      {categories.length > 0 ? (
        <CategoriesBulkForm categories={categories} departments={departments} />
      ) : (
        <p className="text-sm text-slate-500">No categories yet.</p>
      )}
    </section>
  );

  const departmentsTab = (
    <section className="dashboard-card space-y-5">
      <div>
        <p className="eyebrow">Ownership</p>
        <h2 className="mt-1 text-xl font-semibold">Departments</h2>
      </div>
      <MetadataForm operation="createDepartment" />
      {departments.length > 0 && (
        <DepartmentsBulkForm departments={departments} />
      )}
    </section>
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Configuration</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Event metadata
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Edit metadata used by budgets, expenses, and travel reimbursements.
        </p>
      </div>

      <MetadataTabs
        travel={travelTab}
        expenses={expensesTab}
        departments={departmentsTab}
      />
    </main>
  );
}
