export const AdminRole = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  SUPPORT: "support",
});

export function isAdminRole(value) {
  return Object.values(AdminRole).includes(value);
}

export function createAdminSession({
  uid = "local-preview-admin",
  email,
  displayName,
  photoURL = "",
  adminRole = AdminRole.SUPER_ADMIN,
  isActive = true,
}) {
  return {
    uid,
    email,
    displayName: displayName || email,
    photoURL: String(photoURL ?? "").trim(),
    adminRole,
    isActive,
  };
}
