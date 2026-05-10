const errorMessageKeys = [
  ["Firebase config is missing", "errors.firebaseMissing"],
  ["Email and password are required", "errors.emailPasswordRequired"],
  ["Email is required", "errors.emailRequired"],
  ["admin email was not found", "errors.adminEmailNotFound"],
  ["not registered as an admin", "errors.noAdmin"],
  ["Admin profile does not match", "errors.adminMismatch"],
  ["Admin profile email is missing", "errors.adminEmailMissing"],
  ["admin account is disabled", "errors.adminDisabled"],
  ["admin role is not supported", "errors.roleUnsupported"],
  ["Invalid email or password", "errors.invalidCredential"],
  ["valid email", "errors.invalidEmail"],
  ["too many attempts", "errors.tooManyRequests"],
  ["permission", "errors.permissionDenied"],
  ["unavailable", "errors.unavailable"],
];

export function translateAuthError(error, t) {
  const message = String(error?.message || error || "");
  const match = errorMessageKeys.find(([text]) => message.toLowerCase().includes(text.toLowerCase()));
  return match ? t(match[1]) : message || t("errors.generic");
}
