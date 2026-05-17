import {
  collection,
  deleteDoc,
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
  async listDocumentsPage({ pageSize = 50, cursor = null } = {}) {
    const { db } = getFirebaseServices();
    const documentsRef = collection(db, "documents");
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);
    let q = query(
      documentsRef,
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(safeLimit),
    );
    if (cursor?.createdAt && cursor?.id) {
      q = query(q, startAfter(cursor.createdAt, cursor.id));
    }
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(mapDocSnap);
    const last = snapshot.docs[snapshot.docs.length - 1] ?? null;
    return {
      items,
      hasMore: snapshot.docs.length === safeLimit,
      cursor: last
        ? {
            id: last.id,
            createdAt: last.get("createdAt") ?? null,
          }
        : null,
    };
  }

  async listDocuments({ pageSize = 50 } = {}) {
    const page = await this.listDocumentsPage({ pageSize });
    return page.items;
  }

  async listDocumentsByOrganizationIdPage({
    organizationId,
    pageSize = 100,
    cursor = null,
  } = {}) {
    const orgId = String(organizationId ?? "").trim();
    if (!orgId) throw new Error("organizationId is required.");
    const { db } = getFirebaseServices();
    const documentsRef = collection(db, "documents");
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);
    let q = query(
      documentsRef,
      where("orgId", "==", orgId),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(safeLimit),
    );
    if (cursor?.createdAt && cursor?.id) {
      q = query(q, startAfter(cursor.createdAt, cursor.id));
    }
    const snapshot = await getDocs(q);
    let docs = snapshot.docs;
    if (!cursor) {
      const legacyQuery = query(
        documentsRef,
        where("organizationId", "==", orgId),
        orderBy("createdAt", "desc"),
        orderBy(documentId(), "desc"),
        limit(safeLimit),
      );
      const legacySnapshot = await getDocs(legacyQuery);
      const seenIds = new Set(docs.map((docSnap) => docSnap.id));
      docs = [...docs];
      for (const docSnap of legacySnapshot.docs) {
        if (!seenIds.has(docSnap.id)) {
          seenIds.add(docSnap.id);
          docs.push(docSnap);
        }
      }
      docs.sort((a, b) => {
        const aCreated = a.get("createdAt")?.toMillis?.() ?? 0;
        const bCreated = b.get("createdAt")?.toMillis?.() ?? 0;
        if (aCreated !== bCreated) return bCreated - aCreated;
        return b.id.localeCompare(a.id);
      });
      docs = docs.slice(0, safeLimit);
    }
    const items = docs.map(mapDocSnap);
    const last = docs[docs.length - 1] ?? null;
    return {
      items,
      hasMore: docs.length === safeLimit,
      cursor: last
        ? {
            id: last.id,
            createdAt: last.get("createdAt") ?? null,
          }
        : null,
    };
  }

  async listDocumentsByOrganizationId({ organizationId, pageSize = 100 } = {}) {
    const page = await this.listDocumentsByOrganizationIdPage({ organizationId, pageSize });
    return page.items;
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
