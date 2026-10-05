import type { Role } from "@prisma/client";

// Client-safe on purpose: no server-only imports so this can be shared by
// client components (registration form, settings form, role dropdowns)
// without pulling server code into the browser bundle.

export const ROLE_ORDER = [
  "ADMIN",
  "HACKER",
  "ORGANIZER",
  "ORGANIZER_LEAD",
  "DIRECTOR",
] as const satisfies readonly Role[];

export const PERMISSION_KEYS = [
  "seeBudget",
  "addExpenses",
  "askRefund",
  "seeFullDashboard",
  "seePastBudgets",
  "checkRefunds",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const permissionLabels: Record<PermissionKey, string> = {
  seeBudget: "See budget",
  addExpenses: "Add expenses",
  askRefund: "Ask for refund",
  seeFullDashboard: "See complete dashboard",
  seePastBudgets: "See past budgets",
  checkRefunds: "Check refunds",
};

// "Ask for refund" and "check refunds" mirror the travel reimbursement
// flow and aren't wired up to anything yet — the toggle is just stored for
// when that flow ships.
export const UNIMPLEMENTED_PERMISSIONS: readonly PermissionKey[] = [
  "askRefund",
  "checkRefunds",
];

// These permissions are scoped to the organizer's own department whenever
// their role is linked to one (requiresDepartment is on for that role).
export const DEPARTMENT_SCOPED_PERMISSIONS: readonly PermissionKey[] = [
  "seeBudget",
  "addExpenses",
  "seeFullDashboard",
  "seePastBudgets",
];

export type RoleSetting = {
  label: string;
  enabled: boolean;
  /** Admin's name/activation are fixed; every other role can be renamed
   * and (other than Admin) turned off entirely. */
  canRename: boolean;
  canDisable: boolean;
  /** Only Organizer / Organizer Lead can optionally be tied to a
   * department. */
  canToggleDepartment: boolean;
  requiresDepartment: boolean;
  /** Participant has no admin-style permissions to configure (the only
   * one it ever holds, "Ask for refund", is fixed), so its permission
   * checkboxes aren't shown at all. */
  canEditPermissions: boolean;
  permissions: Record<PermissionKey, boolean>;
};

export type RoleSettingsMap = Record<Role, RoleSetting>;

function permissions(
  overrides: Partial<Record<PermissionKey, boolean>>,
): Record<PermissionKey, boolean> {
  return {
    seeBudget: false,
    addExpenses: false,
    askRefund: false,
    seeFullDashboard: false,
    seePastBudgets: false,
    checkRefunds: false,
    ...overrides,
  };
}

export const DEFAULT_ROLE_SETTINGS: RoleSettingsMap = {
  ADMIN: {
    label: "Admin",
    enabled: true,
    canRename: false,
    canDisable: false,
    canToggleDepartment: false,
    requiresDepartment: false,
    canEditPermissions: true,
    permissions: permissions({
      seeBudget: true,
      addExpenses: true,
      askRefund: true,
      seeFullDashboard: true,
      seePastBudgets: true,
      checkRefunds: true,
    }),
  },
  HACKER: {
    label: "Participant",
    enabled: true,
    canRename: true,
    canDisable: false,
    canToggleDepartment: false,
    requiresDepartment: false,
    canEditPermissions: false,
    permissions: permissions({ askRefund: true }),
  },
  ORGANIZER: {
    label: "Organizer",
    enabled: true,
    canRename: true,
    canDisable: true,
    canToggleDepartment: true,
    requiresDepartment: false,
    canEditPermissions: true,
    permissions: permissions({ seeBudget: true, addExpenses: true }),
  },
  ORGANIZER_LEAD: {
    label: "Organizer Lead",
    enabled: true,
    canRename: true,
    canDisable: true,
    canToggleDepartment: true,
    requiresDepartment: false,
    canEditPermissions: true,
    permissions: permissions({
      seeBudget: true,
      addExpenses: true,
      seeFullDashboard: true,
      seePastBudgets: true,
      checkRefunds: true,
    }),
  },
  DIRECTOR: {
    label: "Director",
    enabled: true,
    canRename: true,
    canDisable: true,
    canToggleDepartment: false,
    requiresDepartment: false,
    canEditPermissions: true,
    permissions: permissions({
      seeBudget: true,
      addExpenses: true,
      seeFullDashboard: true,
      seePastBudgets: true,
      checkRefunds: true,
    }),
  },
};

type StoredRoleSettings = Partial<
  Record<Role, Partial<Pick<RoleSetting, "label" | "enabled" | "requiresDepartment">> & {
    permissions?: Partial<Record<PermissionKey, boolean>>;
  }>
>;

/** Merges a hackathon's stored `settings.roles` (missing/partial for
 * hackathons created before this feature existed) over the defaults, so
 * every role always resolves to a complete, well-typed configuration. */
export function getRoleSettings(settings: unknown): RoleSettingsMap {
  const stored: StoredRoleSettings =
    settings &&
    typeof settings === "object" &&
    "roles" in (settings as Record<string, unknown>) &&
    typeof (settings as { roles?: unknown }).roles === "object"
      ? ((settings as { roles: StoredRoleSettings }).roles ?? {})
      : {};

  const merged = {} as RoleSettingsMap;

  for (const role of ROLE_ORDER) {
    const base = DEFAULT_ROLE_SETTINGS[role];
    const override = stored[role];

    merged[role] = {
      ...base,
      label:
        base.canRename && override?.label?.trim()
          ? override.label.trim()
          : base.label,
      enabled: base.canDisable ? (override?.enabled ?? base.enabled) : true,
      requiresDepartment: base.canToggleDepartment
        ? (override?.requiresDepartment ?? base.requiresDepartment)
        : false,
      permissions: { ...base.permissions, ...override?.permissions },
    };
  }

  return merged;
}

/** Parses the role-config section (shared by the hackathon registration
 * form and the settings "Roles" tab) into the shape stored in
 * `hackathon.settings.roles`. Unlisted/unchecked boxes simply fall back to
 * defaults via getRoleSettings when read back. */
export function parseRoleSettingsFromFormData(
  formData: FormData,
): StoredRoleSettings {
  const result: StoredRoleSettings = {};

  for (const role of ROLE_ORDER) {
    const base = DEFAULT_ROLE_SETTINGS[role];

    if (!base.canRename && !base.canDisable) {
      // Admin: fully fixed, nothing to read from the form.
      continue;
    }

    const label = (formData.get(`role:${role}:label`) as string | null)
      ?.trim();
    const enabled = base.canDisable
      ? formData.get(`role:${role}:enabled`) === "on"
      : true;
    const requiresDepartment =
      base.canToggleDepartment &&
      formData.get(`role:${role}:requiresDepartment`) === "on";

    let rolePermissions: Partial<Record<PermissionKey, boolean>> | undefined;
    if (base.canEditPermissions) {
      rolePermissions = {};
      for (const key of PERMISSION_KEYS) {
        rolePermissions[key] =
          formData.get(`role:${role}:permission:${key}`) === "on";
      }
    }

    result[role] = {
      label: label || undefined,
      enabled,
      requiresDepartment,
      permissions: rolePermissions,
    };
  }

  return result;
}

/** Merges new role settings into an existing `settings` JSON blob without
 * clobbering other personalization keys that may live alongside it. */
export function mergeRoleSettingsIntoHackathonSettings(
  currentSettings: unknown,
  roles: StoredRoleSettings,
): Record<string, unknown> {
  const base =
    currentSettings && typeof currentSettings === "object"
      ? { ...(currentSettings as Record<string, unknown>) }
      : {};

  base.roles = roles;
  return base;
}
