export async function recordAdminAudit(adminAuditRepository, payload, { required = false } = {}) {
  if (!adminAuditRepository?.logAction) {
    if (required) {
      throw new Error("Audit logging is required for this action.");
    }
    return;
  }

  try {
    await adminAuditRepository.logAction(payload);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[admin-audit] Failed to write audit log.", {
        action: payload?.action ?? "",
        targetType: payload?.targetType ?? "",
        targetId: payload?.targetId ?? "",
        error,
      });
    }
    if (required) {
      throw new Error("Action completed, but audit logging failed. Please verify audit log before continuing.");
    }
  }
}
