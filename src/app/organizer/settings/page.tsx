import { CategoriesBulkForm } from "@/components/categories-bulk-form";
import { DepartmentsBulkForm } from "@/components/departments-bulk-form";
import { MetadataForm } from "@/components/metadata-form";
import { RoleSettingsForm } from "@/components/role-settings-form";
import { SettingsTabs } from "@/components/settings-tabs";
import {
  HackathonSettingsForm,
  TravelMessageTemplateForm,
  TravelRequirementForm,
  TravelSettingsForm,
} from "@/components/travel-metadata-forms";
import { ensureUnexpectedCategory } from "@/app/organizer/budget/actions";
import { requireOrganizer } from "@/lib/organizer";
import { getHackathonById } from "@/lib/hackathon";
import { getRoleSettings } from "@/lib/role-settings";
import { prisma } from "@/lib/prisma";
import { formatLocalDateTime } from "@/lib/travel";

export default async function SettingsPage() {
  const organizer = await requireOrganizer(["ADMIN"]);
  const { hackathonId } = organizer;
  const roleSettings = getRoleSettings(organizer.hackathonSettings);

  // General must always exist, even right after registering the hackathon.
  await prisma.department.upsert({
    where: { hackathonId_code: { hackathonId, code: "general" } },
    update: {},
    create: { hackathonId, code: "general", name: "General" },
  });
  // Unexpected expenses must always exist too, so it's always visible here.
  await ensureUnexpectedCategory(hackathonId);

  const [
    categories,
    departments,
    travelSettings,
    travelRequirements,
    travelMessageTemplates,
    hackathon,
  ] = await Promise.all([
    prisma.category.findMany({
      where: { hackathonId },
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { hackathonId },
      orderBy: { name: "asc" },
    }),
    prisma.travelEventSettings.findUnique({ where: { hackathonId } }),
    prisma.travelFinalRequirement.findMany({
      where: { hackathonId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.travelMessageTemplate.findMany({
      where: { hackathonId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    getHackathonById(hackathonId),
  ]);

  const travelReimbursementEnabled =
    hackathon?.travelReimbursementEnabled ?? true;

  const featuresTab = (
    <section className="dashboard-card grid gap-6 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Functionality</p>
        <h2 className="mt-1 text-xl font-semibold">
          Activate or deactivate features
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Turn optional functionality on or off for this hackathon. More
          personalization options will appear here over time.
        </p>
        <div className="mt-5">
          <HackathonSettingsForm
            travelReimbursementEnabled={travelReimbursementEnabled}
          />
        </div>
      </div>
    </section>
  );

  const travelTab = travelReimbursementEnabled ? (
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
  ) : (
    <section className="dashboard-card">
      <p className="eyebrow">Travel configuration</p>
      <h2 className="mt-1 text-xl font-semibold">
        Travel reimbursement is turned off
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Enable the travel reimbursement flow in the Features tab to configure
        event dates, requirements, and message templates.
      </p>
    </section>
  );

  const expensesTab = (
    <section className="dashboard-card space-y-5">
      <div>
        <p className="eyebrow">Expense structure</p>
        <h2 className="mt-1 text-xl font-semibold">Categories</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Each category belongs to one department, used to attribute
          expenses; its subcategories inherit that department.
        </p>
      </div>
      <MetadataForm operation="createCategory" departments={departments} />
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

  const rolesTab = (
    <section className="dashboard-card space-y-5">
      <div>
        <p className="eyebrow">Access management</p>
        <h2 className="mt-1 text-xl font-semibold">Roles &amp; permissions</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Activate or deactivate roles, rename them, link Organizer roles to
          a department, and choose what each role can do.
        </p>
      </div>
      <RoleSettingsForm roleSettings={roleSettings} />
    </section>
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Configuration</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Settings
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Manage feature toggles and the metadata used by budgets, expenses,
          and travel reimbursements.
        </p>
      </div>

      <SettingsTabs
        features={featuresTab}
        travel={travelTab}
        expenses={expensesTab}
        departments={departmentsTab}
        roles={rolesTab}
      />
    </main>
  );
}
