"use client";

import { ChevronDown, ChevronUp, Save, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";
import { MetadataForm } from "@/components/metadata-form";
import { FormPendingOverlay } from "@/components/loading-overlay";
import { useAutoDismiss } from "@/components/use-auto-dismiss";

const initialState: MetadataFormState = {};

// Bulk-edit fields live outside the <form> element (see below) and
// associate with it via the HTML `form` attribute, so each category can
// still nest its own standalone "Add subcategory" form without producing
// invalid nested <form> elements.
const FORM_ID = "categories-bulk-form";
const DELETE_CATEGORY_FORM_ID = "delete-category-form";
const DELETE_SUBCATEGORY_FORM_ID = "delete-subcategory-form";

function DeleteButton({
  formId,
  id,
  label,
  message,
  disabled,
}: {
  formId: string;
  id: string;
  label: string;
  message: string;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      form={formId}
      name="id"
      value={id}
      disabled={disabled}
      className="secondary-button !h-12 !border-red-200 !text-red-700"
      aria-label={label}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <Trash2 size={18} aria-hidden="true" />
    </button>
  );
}

type Department = {
  id: string;
  name: string;
};

type Subcategory = {
  id: string;
  name: string;
  active: boolean;
  departmentId: string;
  updatedAt: string | Date;
};

type Category = {
  id: string;
  name: string;
  active: boolean;
  updatedAt: string | Date;
  subcategories: Subcategory[];
};

type CategoriesBulkFormProps = {
  categories: Category[];
  departments: Department[];
};

const inactiveClasses =
  "has-[input[type=checkbox]:not(:checked)]:bg-slate-100 has-[input[type=checkbox]:not(:checked)]:text-slate-400 has-[input[type=checkbox]:not(:checked)]:[&_input:not([type=checkbox])]:bg-slate-100 has-[input[type=checkbox]:not(:checked)]:[&_select]:bg-slate-100";

function SubcategoriesSection({
  category,
  departments,
  deleting,
}: {
  category: Category;
  departments: Department[];
  deleting: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const Chevron = collapsed ? ChevronDown : ChevronUp;

  return (
    <div className="border-l-2 border-violet-100 pl-4">
      <div className="flex items-center justify-between py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Subcategories ({category.subcategories.length})
        </p>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <Chevron size={14} aria-hidden="true" />
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {/* Hidden rather than unmounted so collapsed rows still submit with the
          bulk save. */}
      <div hidden={collapsed} className="space-y-2 pb-3">
        <MetadataForm
          operation="createSubcategory"
          categoryId={category.id}
          departments={departments}
        />
        <hr className="!my-4 border-slate-200" />
        {category.subcategories.map((subcategory) => (
          <div
            key={`${subcategory.id}:${new Date(subcategory.updatedAt).getTime()}`}
            className={`flex flex-wrap items-end gap-2 rounded-xl p-2 transition-colors ${inactiveClasses}`}
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
            <DeleteButton
              formId={DELETE_SUBCATEGORY_FORM_ID}
              id={subcategory.id}
              label={`Delete ${subcategory.name}`}
              message={`Delete the ${subcategory.name} subcategory? Its budget is deleted too; expenses keep their category label.`}
              disabled={deleting}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [categoryDeleteState, deleteCategoryAction, deletingCategory] =
    useActionState(saveMetadata, initialState);
  const [subcategoryDeleteState, deleteSubcategoryAction, deletingSubcategory] =
    useActionState(saveMetadata, initialState);
  const deleting = deletingCategory || deletingSubcategory;
  const results = [
    { state, show: useAutoDismiss(state) },
    { state: categoryDeleteState, show: useAutoDismiss(categoryDeleteState) },
    {
      state: subcategoryDeleteState,
      show: useAutoDismiss(subcategoryDeleteState),
    },
  ].filter((result) => result.show);
  const error = results.find((result) => result.state.error)?.state.error;
  const saved = !error && results.some((result) => result.state.success);

  return (
    <div className="space-y-5">
      <form id={FORM_ID} action={formAction}>
<FormPendingOverlay />
        <input type="hidden" name="operation" value="bulkUpdateCategories" />
      </form>

      {categories.map((category) => (
        <article
          // Remounting when `updatedAt` changes forces uncontrolled inputs to
          // pick up the freshly-saved defaultValue. React resets a submitted
          // form's uncontrolled fields once the action settles; without a key
          // tied to the data, that reset re-applies the pre-save value and
          // the field is stuck showing stale data even though the save
          // succeeded (the next server refresh arrives too late to matter).
          key={`${category.id}:${new Date(category.updatedAt).getTime()}`}
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
            <DeleteButton
              formId={DELETE_CATEGORY_FORM_ID}
              id={category.id}
              label={`Delete ${category.name}`}
              message={`Delete the ${category.name} category? All its subcategories and their budgets are deleted too; expenses keep their category label.`}
              disabled={deleting}
            />
          </div>
          <SubcategoriesSection
            category={category}
            departments={departments}
            deleting={deleting}
          />
        </article>
      ))}

      <div className="flex items-center justify-end gap-4">
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-xs text-emerald-600">
            Saved.
          </p>
        )}
        <SaveButton pending={pending} />
      </div>

      {/* Separate forms (delete buttons join them via the `form` attribute)
          so pressing Enter in a name field never triggers a delete.
          `contents` (not `hidden`) so their loading overlays still render. */}
      <form
        id={DELETE_CATEGORY_FORM_ID}
        action={deleteCategoryAction}
        className="contents"
      >
        <FormPendingOverlay label="Deleting…" />
        <input type="hidden" name="operation" value="deleteCategory" />
      </form>
      <form
        id={DELETE_SUBCATEGORY_FORM_ID}
        action={deleteSubcategoryAction}
        className="contents"
      >
        <FormPendingOverlay label="Deleting…" />
        <input type="hidden" name="operation" value="deleteSubcategory" />
      </form>
    </div>
  );
}
