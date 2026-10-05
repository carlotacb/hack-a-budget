"use client";

import { useActionState } from "react";
import { saveMetadata, type MetadataFormState } from "@/app/organizer/settings/actions";
import { FormPendingOverlay } from "@/components/loading-overlay";
import { RoleSettingsFields } from "@/components/role-settings-fields";
import { Toast } from "@/components/toast";
import { useAutoDismiss } from "@/components/use-auto-dismiss";
import type { RoleSettingsMap } from "@/lib/role-settings";

const initialState: MetadataFormState = {};

export function RoleSettingsForm({
  roleSettings,
}: {
  roleSettings: RoleSettingsMap;
}) {
  const [state, formAction, pending] = useActionState(
    saveMetadata,
    initialState,
  );
  const showMessage = useAutoDismiss(state);

  return (
    <form action={formAction} className="space-y-5">
      <FormPendingOverlay />
      <input type="hidden" name="operation" value="updateRoleSettings" />
      <RoleSettingsFields initialSettings={roleSettings} />
      <div className="flex items-center justify-end gap-4">
        {showMessage && state.error && <Toast kind="error">{state.error}</Toast>}
        {showMessage && state.success && <Toast kind="success">Saved.</Toast>}
        <button className="primary-button" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
