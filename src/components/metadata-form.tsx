"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";

const initialState: MetadataFormState = {};

type Department = {
  id: string;
  name: string;
};

type MetadataFormProps = {
  operation: "createCategory" | "createSubcategory" | "createDepartment";
  categoryId?: string;
  departments?: Department[];
};

export function MetadataForm({
  operation,
  categoryId,
  departments,
}: MetadataFormProps) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );
  const isSubcategory = operation === "createSubcategory";

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="operation" value={operation} />
      {categoryId && (
        <input type="hidden" name="categoryId" value={categoryId} />
      )}
      <label className="field min-w-40 flex-[2]">
        <span>New name</span>
        <input name="name" placeholder="Name" required />
      </label>
      {isSubcategory && (
        <label className="field min-w-40 flex-[2]">
          <span>Department</span>
          <select name="departmentId" required defaultValue="">
            <option value="" disabled>
              Select a department
            </option>
            {departments?.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        className="secondary-button !h-12 text-sm"
        disabled={pending}
        aria-label={pending ? "Adding..." : "Add"}
      >
        {pending ? "Adding..." : <Plus size={18} aria-hidden="true" />}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-xs text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="w-full text-xs text-emerald-600">
          Saved.
        </p>
      )}
    </form>
  );
}
