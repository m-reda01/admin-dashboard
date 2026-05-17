import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

function sanitizeValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    if (/token|secret|password|authorization|bearer|api[-_]?key/i.test(value)) {
      return "[REDACTED]";
    }
    if (/^https?:\/\//i.test(value) && value.length > 160) {
      return value.slice(0, 157) + "...";
    }
    return value.length > 500 ? value.slice(0, 497) + "..." : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/password|secret|token|authorization|api[-_]?key/i.test(k)) {
        out[k] = "[REDACTED]";
        continue;
      }
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return String(value);
}

export class FirebaseAdminAuditRepository {
  async logAction({
    action,
    targetType,
    targetId,
    before = null,
    after = null,
    metadata = null,
  }) {
    const { db, auth } = getFirebaseServices();
    const adminUser = auth.currentUser;
    if (!adminUser?.uid) {
      throw new Error("Admin session is required for audit logging.");
    }

    await addDoc(collection(db, "admin_logs"), {
      adminId: adminUser.uid,
      adminEmail: String(adminUser.email ?? "").trim().toLowerCase(),
      action: String(action ?? "").trim(),
      targetType: String(targetType ?? "").trim(),
      targetId: String(targetId ?? "").trim(),
      before: sanitizeValue(before),
      after: sanitizeValue(after),
      metadata: sanitizeValue(metadata),
      createdAt: serverTimestamp(),
    });
  }
}
