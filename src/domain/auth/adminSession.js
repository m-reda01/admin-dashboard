export const AdminRole = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  SUPPORT: "support",
});

export function isAdminRole(value) {
  return Object.values(AdminRole).includes(normalizeAdminRole(value));
}

export function normalizeAdminRole(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createAdminSession({
  uid,
  email,
  displayName,
  photoURL = "",
  adminRole,
  isActive = true,
}) {
  const normalizedRole = normalizeAdminRole(adminRole);
  if (!uid) {
    throw new Error("Admin session uid is required.");
  }
  if (!email) {
    throw new Error("Admin session email is required.");
  }
  if (!isAdminRole(normalizedRole)) {
    throw new Error("This admin role is not supported.");
  }
  if (isActive !== true) {
    throw new Error("This admin account is disabled.");
  }
  return {
    uid,
    email,
    displayName: displayName || email,
    photoURL: String(photoURL ?? "").trim(),
    adminRole: normalizedRole,
    isActive: true,
  };
}
