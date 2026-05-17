import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
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
  async listPaymentsPage({
    pageSize = 100,
    filterOrganizationId = null,
    filterOrganizationOwnerUid = null,
    cursor = null,
  } = {}) {
    const { db } = getFirebaseServices();
    const ref = collection(db, "payments");
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);
    const orgId = String(filterOrganizationId ?? "").trim();
    const ownerUid = String(filterOrganizationOwnerUid ?? "").trim();
    const hasOrgFilter = Boolean(orgId);
    const hasOwnerFilter = Boolean(ownerUid);

    let q = query(ref);
    if (hasOrgFilter) {
      q = query(q, where("orgId", "==", orgId));
    } else if (hasOwnerFilter) {
      q = query(q, where("userId", "==", ownerUid));
    }
    q = query(q, orderBy("createdAt", "desc"), orderBy(documentId(), "desc"), limit(safeLimit));
    if (cursor?.createdAt && cursor?.id) {
      q = query(q, startAfter(cursor.createdAt, cursor.id));
    }

    const snapshot = await getDocs(q);
    let rows = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        amount: data.amount ?? 0,
        cardBrand: data.cardBrand ?? "",
        customerId: data.customerId ?? data.userId ?? "",
        customerType: data.customerType ?? (data.orgId ? "organization" : "individual"),
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
        payerUid: data.payerUid ?? data.userId ?? "",
        status: data.status ?? "",
        userId: data.userId ?? "",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      };
    });

    if (hasOrgFilter || hasOwnerFilter) {
      rows = rows.filter((r) =>
        paymentMatchesOrganizationFilters(r, filterOrganizationId, filterOrganizationOwnerUid),
      );
    }

    const last = snapshot.docs[snapshot.docs.length - 1] ?? null;
    const cursorOut = last
      ? {
          id: last.id,
          createdAt: last.get("createdAt") ?? null,
        }
      : null;
    return {
      items: rows,
      hasMore: snapshot.docs.length === safeLimit,
      cursor: cursorOut,
    };
  }

  async listPayments({
    pageSize = 100,
    filterOrganizationId = null,
    filterOrganizationOwnerUid = null,
  } = {}) {
    const page = await this.listPaymentsPage({
      pageSize,
      filterOrganizationId,
      filterOrganizationOwnerUid,
    });
    return page.items;
  }

  async deletePayment(paymentDocId) {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, "payments", paymentDocId));
  }
}
