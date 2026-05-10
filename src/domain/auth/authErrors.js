export function normalizeAuthError(error) {
  const message = String(error?.message || error || "");

  if (message.includes("Firebase config is missing")) return message;
  if (message.includes("Email is required")) return "Email is required.";
  if (message.includes("admin email was not found")) return "This admin email was not found.";
  if (message.includes("not registered as an admin")) return "This account is not registered as an admin.";
  if (message.includes("Admin profile does not match")) return "Admin profile does not match this account.";
  if (message.includes("Admin profile email is missing")) return "Admin profile email is missing.";
  if (message.includes("admin account is disabled")) return "This admin account is disabled.";
  if (message.includes("admin role is not supported")) return "This admin role is not supported.";
  if (message.includes("auth/invalid-credential")) return "Invalid email or password.";
  if (message.includes("auth/invalid-email")) return "Please enter a valid email address.";
  if (message.includes("auth/missing-email")) return "Email is required.";
  if (message.includes("auth/user-not-found")) return "Invalid email or password.";
  if (message.includes("auth/wrong-password")) return "Invalid email or password.";
  if (message.includes("auth/user-disabled")) return "This account has been disabled.";
  if (message.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";
  if (message.includes("permission-denied")) return "You do not have permission to read admin access data.";
  if (message.includes("unavailable")) return "Firebase is unavailable. Check your connection and try again.";

  return message || "Unable to sign in.";
}
