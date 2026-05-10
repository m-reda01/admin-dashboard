import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

function isOrganizationPaymentShape(row) {
  const purpose = String(row?.purpose ?? "").toLowerCase();
  if (purpose === "organization_subscription") return true;
  if (String(row?.description ?? "").includes("Organization subscription")) return true;
  return Boolean(String(row?.orgId ?? "").trim());
}

function paymentMatchesOrganizationFilters(row, filterOrganizationId, filterOrganizationOwnerUid) {
  const orgId = String(filterOrganizationId ?? "").trim();
  const ownerUid = String(filterOrganizationOwnerUid ?? "").trim();
  const oid = String(row.orgId ?? "").trim();
  const uid = String(row.userId ?? "").trim();
  if (orgId && oid === orgId) return true;
  if (ownerUid && uid === ownerUid) {
    if (orgId && oid && oid !== orgId) return false;
    return isOrganizationPaymentShape(row);
  }
  return false;
}

export class FirebasePaymentsRepository {
  async listPayments({
    pageSize = 100,
    filterOrganizationId = null,
    filterOrganizationOwnerUid = null,
  } = {}) {
    const { db } = getFirebaseServices();
    const ref = collection(db, "payments");
    const orgFilter =
      Boolean(String(filterOrganizationId ?? "").trim()) ||
      Boolean(String(filterOrganizationOwnerUid ?? "").trim());
    const fetchLimit = orgFilter ? Math.min(Math.max(pageSize * 8, 400), 500) : pageSize;
    const q = query(ref, orderBy("createdAt", "desc"), limit(fetchLimit));
    const snapshot = await getDocs(q);

    let rows = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        amount: data.amount ?? 0,
        cardBrand: data.cardBrand ?? "",
        currency: data.currency ?? "SAR",
        description: data.description ?? "",
        failureMessage: data.failureMessage ?? "",
        invoiceId: data.invoiceId ?? null,
        maskedCardNumber: data.maskedCardNumber ?? "",
        method: data.method ?? "",
        orgId: data.orgId ?? "",
        paymentId: data.paymentId ?? "",
        providerCreatedAt: data.providerCreatedAt ?? "",
        purpose: data.purpose ?? "",
        status: data.status ?? "",
        userId: data.userId ?? "",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      };
    });

    if (orgFilter) {
      rows = rows
        .filter((r) =>
          paymentMatchesOrganizationFilters(r, filterOrganizationId, filterOrganizationOwnerUid),
        )
        .slice(0, pageSize);
    }

    return rows;
  }

  async deletePayment(paymentDocId) {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, "payments", paymentDocId));
  }
}
