import { AdminRole, normalizeAdminRole } from "./adminSession.js";

export function canViewAdminsPage(adminRole) {
  const role = normalizeAdminRole(adminRole);
  return role === AdminRole.SUPER_ADMIN || role === AdminRole.ADMIN;
}

export function canMutateAdmins(adminRole) {
  return normalizeAdminRole(adminRole) === AdminRole.SUPER_ADMIN;
}
