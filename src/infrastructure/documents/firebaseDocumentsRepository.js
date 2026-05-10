import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

function mapDocSnap(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : null,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : null,
  };
}

export class FirebaseDocumentsRepository {
  async listDocuments({ pageSize = 50 } = {}) {
    const { db } = getFirebaseServices();
    const documentsRef = collection(db, "documents");
    const q = query(documentsRef, orderBy("createdAt", "desc"), limit(pageSize));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(mapDocSnap);
  }

  async listDocumentsByOrganizationId({ organizationId, pageSize = 100 } = {}) {
    const orgId = String(organizationId ?? "").trim();
    if (!orgId) throw new Error("organizationId is required.");
    const { db } = getFirebaseServices();
    const documentsRef = collection(db, "documents");
    const q = query(
      documentsRef,
      where("organizationId", "==", orgId),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDocSnap);
  }

  async deleteDocument({ documentId }) {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, "documents", documentId));
  }

  async updateDocument({ documentId, data }) {
    const { db } = getFirebaseServices();
    const docRef = doc(db, "documents", documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { id: documentId, ...data };
  }
}

