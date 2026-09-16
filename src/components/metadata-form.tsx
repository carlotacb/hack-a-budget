"use client";

import { useActionState } from "react";
import {
  type MetadataFormState,
  saveMetadata,
} from "@/app/organizer/settings/metadata/actions";

const initialState: MetadataFormState = {};

type MetadataFormProps = {
  operation:
    | "createCategory"
    | "updateCategory"
    | "createSubcategory"
    | "updateSubcategory"
    | "createDepartment"
    | "updateDepartment";
  id?: string;
  categoryId?: string;
  name?: string;
  code?: string;
  active?: boolean;
};

export function MetadataForm({
  operation,
  id,
  categoryId,
  name = "",
  code,
  active = true,
}: MetadataFormProps) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );
  const isCreate = operation.startsWith("create");
  const isDepartment = operation.endsWith("Department");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="operation" value={operation} />
      {id && <input type="hidden" name="id" value={id} />}
      {categoryId && (
        <input type="hidden" name="categoryId" value={categoryId} />
      )}
      {isDepartment && (
        <label className="field min-w-28 flex-1">
          <span>Code</span>
          <input name="code" defaultValue={code} placeholder="code" required />
        </label>
      )}
      <label className="field min-w-40 flex-[2]">
        <span>{isCreate ? "New name" : "Name"}</span>
        <input name="name" defaultValue={name} placeholder="Name" required />
      </label>
      {!isCreate && (
        <label className="flex h-12 items-center gap-2 px-2 text-sm text-slate-600">
          <input name="active" type="checkbox" defaultChecked={active} />
          Active
        </label>
      )}
      <button className="secondary-button !h-12 text-sm" disabled={pending}>
        {pending ? "Saving..." : isCreate ? "Add" : "Save"}
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
