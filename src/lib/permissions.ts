import {
  ROLE_PERMISSIONS,
  hasPermission,
  isAdminRole,
  type Permission,
  type UserRole,
} from "@/types/user";

/**
 * Permission helpers — foundation only.
 * Wire to session/auth in a later phase.
 */

export function getPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function canAccessAdmin(role: UserRole): boolean {
  return isAdminRole(role) && ROLE_PERMISSIONS[role].includes("admin:access");
}

export { hasPermission, isAdminRole };
