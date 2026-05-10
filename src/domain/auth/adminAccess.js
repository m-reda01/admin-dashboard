import { isAdminRole } from "./adminSession.js";

export function validateAdminDocument(adminDocument, uid) {
  if (!adminDocument) {
    throw new Error("This account is not registered as an admin.");
  }

  if (!adminDocument.uid || adminDocument.uid !== uid) {
    throw new Error("Admin profile does not match this account.");
  }

  if (!adminDocument.email) {
    throw new Error("Admin profile email is missing.");
  }

  if (adminDocument.isActive !== true) {
    throw new Error("This admin account is disabled.");
  }

  if (!isAdminRole(adminDocument.adminRole)) {
    throw new Error("This admin role is not supported.");
  }
}

export function validateAdminPasswordResetDocument(adminDocument) {
  if (!adminDocument) {
    throw new Error("This admin email was not found.");
  }
}
