import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { ComplaintStatus, PaymentStatus } from "../../domain/firestore/entityStatus.js";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

/** Includes legacy values until Firestore data is migrated. */
const COMPLAINT_STATUSES = [
  ComplaintStatus.open,
  ComplaintStatus.inProgress,
  "pending",
  ComplaintStatus.resolved,
  "closed",
  ComplaintStatus.rejected,
];

const PAYMENT_STATUSES = [
  PaymentStatus.pending,
  PaymentStatus.paid,
  PaymentStatus.failed,
  PaymentStatus.refunded,
  PaymentStatus.cancelled,
];

async function safeCount(collectionRefOrQuery) {
  try {
    const snapshot = await getCountFromServer(collectionRefOrQuery);
    return snapshot.data().count;
  } catch {
    return null;
  }
}

export class FirebaseAdminDashboardRepository {
  constructor() {
    this._countsCache = null;
    this._countsCacheAtMs = 0;
    this._countsCacheTtlMs = 60 * 1000;
  }

  async getAggregateCounts() {
    const now = Date.now();
    if (this._countsCache && now - this._countsCacheAtMs < this._countsCacheTtlMs) {
      return this._countsCache;
    }
    const { db } = getFirebaseServices();
    const complaintsCol = collection(db, "complaints");
    const paymentsCol = collection(db, "payments");

    const [
      users,
      organizations,
      organizationsActive,
      documents,
      paymentsTotal,
      complaintsTotal,
      ...rest
    ] = await Promise.all([
      safeCount(collection(db, "users")),
      safeCount(collection(db, "orgs")),
      safeCount(query(collection(db, "orgs"), where("isActive", "==", true))),
      safeCount(collection(db, "documents")),
      safeCount(collection(db, "payments")),
      safeCount(collection(db, "complaints")),
      ...COMPLAINT_STATUSES.map((status) => safeCount(query(complaintsCol, where("status", "==", status)))),
      ...PAYMENT_STATUSES.map((status) => safeCount(query(paymentsCol, where("status", "==", status)))),
    ]);

    const complaintSlice = rest.slice(0, COMPLAINT_STATUSES.length);
    const paymentSlice = rest.slice(COMPLAINT_STATUSES.length);

    const complaintsByStatus = Object.fromEntries(COMPLAINT_STATUSES.map((s, i) => [s, complaintSlice[i]]));
    const paymentsByStatus = Object.fromEntries(PAYMENT_STATUSES.map((s, i) => [s, paymentSlice[i]]));

    const result = {
      users,
      organizations,
      organizationsActive,
      documents,
      paymentsTotal,
      complaintsTotal,
      complaintsByStatus,
      paymentsByStatus,
    };
    this._countsCache = result;
    this._countsCacheAtMs = now;
    return result;
  }
}
