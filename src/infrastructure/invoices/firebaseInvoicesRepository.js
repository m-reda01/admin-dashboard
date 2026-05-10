import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

export class FirebaseInvoicesRepository {
  async listInvoices({ pageSize = 100 } = {}) {
    const { db } = getFirebaseServices();
    const ref = collection(db, "invoices");
    const q = query(ref, orderBy("createdAt", "desc"), limit(pageSize));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        invoiceNumber: data.invoiceNumber ?? "",
        clientName: data.clientName ?? "",
        clientEmail: data.clientEmail ?? "",
        issueDate: data.issueDate?.toDate ? data.issueDate.toDate() : new Date(),
        dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : null,
        status: data.status ?? "draft",
        totalAmount: data.totalAmount ?? 0,
        currency: data.currency ?? "SAR",
        description: data.description ?? "",
        userId: data.userId ?? "",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      };
    });
  }

  async createInvoice(invoiceData) {
    const { db } = getFirebaseServices();
    const ref = collection(db, "invoices");
    // Implementation for creating invoice
    // This would need addDoc or similar
    throw new Error("Create invoice not implemented yet");
  }
}