import { isAdminRole, normalizeAdminRole } from "./adminSession.js";

export function validateAdminDocument(adminDocument, uid) {
  if (!adminDocument) {
    throw new Error("This account is not registered as an admin.");
  }

  const profileUid = String(adminDocument.uid ?? "").trim();
  const expectedUid = String(uid ?? "").trim();
  const email = String(adminDocument.email ?? "").trim().toLowerCase();
  const role = normalizeAdminRole(adminDocument.adminRole);
  const status = String(adminDocument.status ?? "").trim().toLowerCase();

  if (!profileUid || profileUid !== expectedUid) {
    throw new Error("Admin profile does not match this account.");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Admin profile email is missing.");
  }

  if (adminDocument.isActive !== true) {
    throw new Error("This admin account is disabled.");
  }

  if (status === "suspended" || status === "deleted" || adminDocument.deletedAt || adminDocument.isDeleted === true) {
    throw new Error("This admin account is disabled.");
  }

  if (!isAdminRole(role)) {
    throw new Error("This admin role is not supported.");
  }

  return {
    ...adminDocument,
    uid: profileUid,
    email,
    adminRole: role,
    isActive: true,
  };
}

export function validateAdminPasswordResetDocument(adminDocument) {
  if (!adminDocument) {
    throw new Error("This admin email was not found.");
  }
  if (adminDocument.isActive !== true) {
    throw new Error("This admin account is disabled.");
  }
  const status = String(adminDocument.status ?? "").trim().toLowerCase();
  if (status === "suspended" || status === "deleted" || adminDocument.deletedAt || adminDocument.isDeleted === true) {
    throw new Error("This admin account is disabled.");
  }
  if (!isAdminRole(adminDocument.adminRole)) {
    throw new Error("This admin role is not supported.");
  }
}
