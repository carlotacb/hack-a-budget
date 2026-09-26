"use client";

import { Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";

const initialState: MetadataFormState = {};

const GENERAL_DEPARTMENT_CODE = "general";
const DELETE_FORM_ID = "delete-department-form";

type Department = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  updatedAt: string | Date;
};

type DepartmentsBulkFormProps = {
  departments: Department[];
};

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      className="primary-button"
      disabled={pending}
    >
      <Save size={18} aria-hidden="true" />
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

export function DepartmentsBulkForm({ departments }: DepartmentsBulkFormProps) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    saveMetadata,
    initialState,
  );
  const error = deleteState.error ?? state.error;

  return (
    <>
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="operation" value="bulkUpdateDepartments" />

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {(state.success || deleteState.success) && !error && (
        <p role="status" className="text-xs text-emerald-600">
          Saved.
        </p>
      )}

      {departments.map((department) => {
        const isGeneral = department.code === GENERAL_DEPARTMENT_CODE;

        if (isGeneral) {
          // Always exists and can't be edited, deactivated, or deleted, so
          // it's shown as plain text with no inputs.
          return (
            <div
              key={department.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-medium text-slate-900">{department.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                Default department — always available, so it can&apos;t be
                edited, deactivated, or deleted.
              </p>
            </div>
          );
        }

        return (
          <div
            // Remount when the record actually changes so uncontrolled
            // inputs pick up the freshly-saved defaultValue — see the same
            // note in categories-bulk-form.tsx.
            key={`${department.id}:${new Date(department.updatedAt).getTime()}`}
            // Grey out the whole box (live, as the checkbox is toggled)
            // while the department is inactive.
            className="rounded-2xl border border-slate-200 p-4 transition-colors has-[input[type=checkbox]:not(:checked)]:border-slate-300 has-[input[type=checkbox]:not(:checked)]:bg-slate-100 has-[input[type=checkbox]:not(:checked)]:[&_input:not([type=checkbox])]:bg-slate-100 has-[input[type=checkbox]:not(:checked)]:text-slate-400"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="field min-w-40 flex-[2]">
                <span>Name</span>
                <input
                  name={`department:${department.id}:name`}
                  defaultValue={department.name}
                  placeholder="Name"
                  required
                />
              </label>
              <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
                <input
                  name={`department:${department.id}:active`}
                  type="checkbox"
                  defaultChecked={department.active}
                />
                Active
              </label>
              <button
                type="submit"
                form={DELETE_FORM_ID}
                name="id"
                value={department.id}
                disabled={deleting}
                className="secondary-button !h-12 !border-red-200 !text-red-700"
                aria-label={`Delete ${department.name}`}
                onClick={(event) => {
                  if (
                    !window.confirm(
                      `Delete the ${department.name} department? Expenses assigned to it will become unassigned.`,
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-end">
        <SaveButton pending={pending} />
      </div>

    </form>

      {/* Separate form (delete buttons join it via the `form` attribute) so
          pressing Enter in a name field never triggers a delete. */}
      <form id={DELETE_FORM_ID} action={deleteAction} className="hidden">
        <input type="hidden" name="operation" value="deleteDepartment" />
      </form>
    </>
  );
}
