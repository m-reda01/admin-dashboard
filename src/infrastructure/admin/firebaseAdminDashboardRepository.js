import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

const COMPLAINT_STATUSES = ["open", "pending", "resolved", "closed", "rejected"];
const PAYMENT_STATUSES = ["paid", "pending", "failed", "refunded", "cancelled"];

async function safeCount(collectionRefOrQuery) {
  try {
    const snapshot = await getCountFromServer(collectionRefOrQuery);
    return snapshot.data().count;
  } catch {
    return null;
  }
}

export class FirebaseAdminDashboardRepository {
  async getAggregateCounts() {
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

    return {
      users,
      organizations,
      organizationsActive,
      documents,
      paymentsTotal,
      complaintsTotal,
      complaintsByStatus,
      paymentsByStatus,
    };
  }
}
