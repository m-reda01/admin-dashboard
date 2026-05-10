import { AdminRole } from "./adminSession.js";

export function canViewAdminsPage(adminRole) {
  return adminRole === AdminRole.SUPER_ADMIN || adminRole === AdminRole.ADMIN;
}

export function canMutateAdmins(adminRole) {
  return adminRole === AdminRole.SUPER_ADMIN;
}
