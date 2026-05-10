import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

export class FirebaseComplaintsRepository {
  async updateComplaintStatus({ complaintId, status }) {
    const id = String(complaintId ?? "").trim();
    const nextStatus = String(status ?? "").trim();
    if (!id) throw new Error("Complaint id is required.");
    if (!nextStatus) throw new Error("Status is required.");

    const { db } = getFirebaseServices();
    await updateDoc(doc(db, "complaints", id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * @param {{ userId?: string, pageSize?: number }} params
   */
  async listComplaintsByUserId({ userId, pageSize = 100 } = {}) {
    const uid = String(userId ?? "").trim();
    if (!uid) return [];

    const { db } = getFirebaseServices();
    const snapshot = await getDocs(
      query(collection(db, "complaints"), where("userId", "==", uid), limit(Math.min(Math.max(pageSize, 1), 500))),
    );

    const rows = snapshot.docs.map((documentSnapshot) =>
      mapComplaintDocument(documentSnapshot.id, documentSnapshot.data()),
    );

    return rows.sort((a, b) => {
      const tb = b.createdAt?.getTime?.() || 0;
      const ta = a.createdAt?.getTime?.() || 0;
      return tb - ta;
    });
  }

  /**
   * @param {{ pageSize?: number }} params
   */
  async listComplaints({ pageSize = 200 } = {}) {
    const { db } = getFirebaseServices();
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);

    try {
      const qy = query(collection(db, "complaints"), orderBy("createdAt", "desc"), limit(safeLimit));
      const snapshot = await getDocs(qy);
      return snapshot.docs.map((documentSnapshot) =>
        mapComplaintDocument(documentSnapshot.id, documentSnapshot.data()),
      );
    } catch {
      const snapshot = await getDocs(query(collection(db, "complaints"), limit(safeLimit)));
      const rows = snapshot.docs.map((documentSnapshot) =>
        mapComplaintDocument(documentSnapshot.id, documentSnapshot.data()),
      );
      return rows.sort((a, b) => {
        const tb = b.createdAt?.getTime?.() || 0;
        const ta = a.createdAt?.getTime?.() || 0;
        return tb - ta;
      });
    }
  }
}

function mapComplaintDocument(id, data) {
  return {
    id,
    attachmentUrl: String(data.attachmentUrl ?? "").trim(),
    createdAt: toDate(data.createdAt),
    description: String(data.description ?? "").trim(),
    status: String(data.status ?? "").trim(),
    typeKey: String(data.typeKey ?? "").trim(),
    typeLabel: String(data.typeLabel ?? "").trim(),
    updatedAt: toDate(data.updatedAt),
    userDisplayName: String(data.userDisplayName ?? "").trim(),
    userEmail: String(data.userEmail ?? "").trim(),
    userId: String(data.userId ?? "").trim(),
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}
