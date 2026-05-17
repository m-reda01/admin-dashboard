import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
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
  async listComplaintsByUserIdPage({ userId, pageSize = 100, cursor = null } = {}) {
    const uid = String(userId ?? "").trim();
    if (!uid) return { items: [], hasMore: false, cursor: null };

    const { db } = getFirebaseServices();
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);
    let q = query(
      collection(db, "complaints"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(safeLimit),
    );
    if (cursor?.createdAt && cursor?.id) {
      q = query(q, startAfter(cursor.createdAt, cursor.id));
    }
    const snapshot = await getDocs(q);
    const rows = snapshot.docs.map((documentSnapshot) =>
      mapComplaintDocument(documentSnapshot.id, documentSnapshot.data()),
    );
    const last = snapshot.docs[snapshot.docs.length - 1] ?? null;
    return {
      items: rows,
      hasMore: snapshot.docs.length === safeLimit,
      cursor: last
        ? {
            id: last.id,
            createdAt: last.get("createdAt") ?? null,
          }
        : null,
    };
  }

  async listComplaintsByUserId({ userId, pageSize = 100 } = {}) {
    const page = await this.listComplaintsByUserIdPage({ userId, pageSize });
    return page.items;
  }

  /**
   * @param {{ pageSize?: number }} params
   */
  async listComplaintsPage({ pageSize = 200, cursor = null } = {}) {
    const { db } = getFirebaseServices();
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);
    let qy = query(
      collection(db, "complaints"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(safeLimit),
    );
    if (cursor?.createdAt && cursor?.id) {
      qy = query(qy, startAfter(cursor.createdAt, cursor.id));
    }
    const snapshot = await getDocs(qy);
    const rows = snapshot.docs.map((documentSnapshot) =>
      mapComplaintDocument(documentSnapshot.id, documentSnapshot.data()),
    );
    const last = snapshot.docs[snapshot.docs.length - 1] ?? null;
    return {
      items: rows,
      hasMore: snapshot.docs.length === safeLimit,
      cursor: last
        ? {
            id: last.id,
            createdAt: last.get("createdAt") ?? null,
          }
        : null,
    };
  }

  async listComplaints({ pageSize = 200 } = {}) {
    const page = await this.listComplaintsPage({ pageSize });
    return page.items;
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
