import { getCurrentMembership } from "@/lib/current-hackathon";
import {
  DEPARTMENT_SCOPED_PERMISSIONS,
  getRoleSettings,
  type PermissionKey,
} from "@/lib/role-settings";

/** Resolves the signed-in user's permission to perform `permission` in
 * their active hackathon, based on their role's configured permissions
 * (hackathon.settings.roles). Returns null if there's no session/
 * membership, the role is disabled, or the permission isn't granted.
 *
 * For permissions scoped to a department (see DEPARTMENT_SCOPED_PERMISSIONS),
 * the returned `departmentId` is the organizer's own department when their
 * role is tied to one, or null when the permission applies event-wide
 * (e.g. Admin/Director, or a role not linked to a department). Callers
 * should filter their queries/writes by `departmentId` whenever it's set. */
export async function getPermittedOrganizer(permission: PermissionKey) {
  const current = await getCurrentMembership();

  if (!current?.membership) {
    return null;
  }

  const { membership } = current;
  const roleSettings = getRoleSettings(membership.hackathon.settings);
  const roleSetting = roleSettings[membership.role];

  if (!roleSetting.enabled || !roleSetting.permissions[permission]) {
    return null;
  }

  const isDepartmentScoped =
    DEPARTMENT_SCOPED_PERMISSIONS.includes(permission) &&
    Boolean(membership.departmentId);

  return {
    userId: current.userId,
    hackathonId: membership.hackathonId,
    role: membership.role,
    departmentId: isDepartmentScoped ? membership.departmentId : null,
  };
}
