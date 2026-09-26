"use client";

import { Save, Trash2 } from "lucide-react";
import { useActionState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";
import { Toast } from "@/components/toast";
import { useAutoDismiss } from "@/components/use-auto-dismiss";

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
  const showSave = useAutoDismiss(state);
  const showDelete = useAutoDismiss(deleteState);
  const error =
    (showDelete ? deleteState.error : undefined) ??
    (showSave ? state.error : undefined);
  const saved =
    !error &&
    ((showSave && state.success) || (showDelete && deleteState.success));

  return (
    <>
    <form action={formAction} className="space-y-5">
<FormPendingOverlay />
      <input type="hidden" name="operation" value="bulkUpdateDepartments" />

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
            className="inactive-box rounded-2xl border border-slate-200 p-4"
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
              <button
                type="submit"
                form={DELETE_FORM_ID}
                name="id"
                value={department.id}
                disabled={deleting}
                className="flex h-12 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 disabled:hover:bg-transparent"
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
              <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
                <input
                  name={`department:${department.id}:active`}
                  type="checkbox"
                  defaultChecked={department.active}
                />
                Active
              </label>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-4">
        {error && (
          <Toast kind="error">{error}</Toast>
        )}
        {saved && (
          <Toast kind="success">Saved.</Toast>
        )}
        <SaveButton pending={pending} />
      </div>

    </form>

      {/* Separate form (delete buttons join it via the `form` attribute) so
          pressing Enter in a name field never triggers a delete. `contents`
          (not `hidden`) so its loading overlay still renders. */}
      <form id={DELETE_FORM_ID} action={deleteAction} className="contents">
        <FormPendingOverlay label="Deleting…" />
        <input type="hidden" name="operation" value="deleteDepartment" />
      </form>
    </>
  );
}
