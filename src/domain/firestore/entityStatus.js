/**
 * Canonical Firestore status strings aligned with mobile app usage.
 * Legacy values may still exist in data; see FIRESTORE_CLEANUP_MIGRATION_PLAN.md.
 */
export const DocumentStatus = Object.freeze({
  draft: "draft",
  pendingPayment: "pending_payment",
  paid: "paid",
  certified: "certified",
  minted: "minted",
  rejected: "rejected",
  cancelled: "cancelled",
});

export const PaymentStatus = Object.freeze({
  pending: "pending",
  paid: "paid",
  failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
});

export const SubscriptionStatus = Object.freeze({
  active: "active",
  expired: "expired",
  cancelled: "cancelled",
  pending: "pending",
  inactive: "inactive",
});

export const ComplaintStatus = Object.freeze({
  open: "open",
  inProgress: "in_progress",
  resolved: "resolved",
  rejected: "rejected",
});

export const SubscriptionPackageLifecycleStatus = Object.freeze({
  active: "active",
  retired: "retired",
});

export const OrgStatus = Object.freeze({
  active: "active",
  inactive: "inactive",
  suspended: "suspended",
});

export const MemberStatus = Object.freeze({
  active: "active",
  invited: "invited",
  suspended: "suspended",
  removed: "removed",
  deleted: "deleted",
  inactive: "inactive",
});
