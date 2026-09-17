"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";

const initialState: MetadataFormState = {};

const GENERAL_DEPARTMENT_CODE = "general";

type Department = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type DepartmentsBulkFormProps = {
  departments: Department[];
};

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      className="primary-button"
      disabled={pending}
      aria-label={pending ? "Saving..." : "Save"}
    >
      <Save size={18} aria-hidden="true" />
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export function DepartmentsBulkForm({ departments }: DepartmentsBulkFormProps) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="operation" value="bulkUpdateDepartments" />

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

      {departments.map((department) => {
        const isGeneral = department.code === GENERAL_DEPARTMENT_CODE;

        return (
          <div
            key={department.id}
            className="rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="field min-w-28 flex-1">
                <span>Code</span>
                <input
                  name={`department:${department.id}:code`}
                  defaultValue={department.code}
                  placeholder="code"
                  disabled={isGeneral}
                  required={!isGeneral}
                />
              </label>
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
                  disabled={isGeneral}
                />
                Active
              </label>
            </div>
            {isGeneral && (
              <p className="mt-2 text-xs text-slate-400">
                Protected default department — it can&apos;t be deactivated
                or have its code changed.
              </p>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-end">
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}
