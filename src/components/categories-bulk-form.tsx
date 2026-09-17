"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";
import { MetadataForm } from "@/components/metadata-form";

const initialState: MetadataFormState = {};

// Bulk-edit fields live outside the <form> element (see below) and
// associate with it via the HTML `form` attribute, so each category can
// still nest its own standalone "Add subcategory" form without producing
// invalid nested <form> elements.
const FORM_ID = "categories-bulk-form";

type Department = {
  id: string;
  name: string;
};

type Subcategory = {
  id: string;
  name: string;
  active: boolean;
  departmentId: string;
};

type Category = {
  id: string;
  name: string;
  active: boolean;
  subcategories: Subcategory[];
};

type CategoriesBulkFormProps = {
  categories: Category[];
  departments: Department[];
};

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      form={FORM_ID}
      className="primary-button"
      disabled={pending}
      aria-label={pending ? "Saving..." : "Save"}
    >
      <Save size={18} aria-hidden="true" />
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export function CategoriesBulkForm({
  categories,
  departments,
}: CategoriesBulkFormProps) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );

  return (
    <div className="space-y-5">
      <form id={FORM_ID} action={formAction}>
        <input type="hidden" name="operation" value="bulkUpdateCategories" />
      </form>

      <div className="flex items-center justify-end">
        <SaveButton pending={pending} />
      </div>

      {state.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-xs text-emerald-600">
          Saved.
        </p>
      )}

      {categories.map((category) => (
        <article
          key={category.id}
          className="space-y-3 rounded-2xl border border-slate-200 p-4"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label className="field min-w-40 flex-[2]">
              <span>Name</span>
              <input
                form={FORM_ID}
                name={`category:${category.id}:name`}
                defaultValue={category.name}
                placeholder="Name"
                required
              />
            </label>
            <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
              <input
                form={FORM_ID}
                name={`category:${category.id}:active`}
                type="checkbox"
                defaultChecked={category.active}
              />
              Active
            </label>
          </div>
          <div className="space-y-2 border-l-2 border-violet-100 pl-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Subcategories
            </p>
            {category.subcategories.map((subcategory) => (
              <div
                key={subcategory.id}
                className="flex flex-wrap items-end gap-2"
              >
                <label className="field min-w-40 flex-[2]">
                  <span>Name</span>
                  <input
                    form={FORM_ID}
                    name={`subcategory:${subcategory.id}:name`}
                    defaultValue={subcategory.name}
                    placeholder="Name"
                    required
                  />
                </label>
                <label className="field min-w-40 flex-[2]">
                  <span>Department</span>
                  <select
                    form={FORM_ID}
                    name={`subcategory:${subcategory.id}:departmentId`}
                    defaultValue={subcategory.departmentId}
                    required
                  >
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
                  <input
                    form={FORM_ID}
                    name={`subcategory:${subcategory.id}:active`}
                    type="checkbox"
                    defaultChecked={subcategory.active}
                  />
                  Active
                </label>
              </div>
            ))}
            <MetadataForm
              operation="createSubcategory"
              categoryId={category.id}
              departments={departments}
            />
          </div>
        </article>
      ))}

      <div className="flex items-center justify-end">
        <SaveButton pending={pending} />
      </div>
    </div>
  );
}
