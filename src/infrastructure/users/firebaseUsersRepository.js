import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

export class FirebaseUsersRepository {
  async listUsersPage({ pageSize = 50, cursor = null } = {}) {
    const { db } = getFirebaseServices();
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);
    let usersQuery = query(
      collection(db, "users"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(safeLimit),
    );
    if (cursor?.createdAt && cursor?.id) {
      usersQuery = query(usersQuery, startAfter(cursor.createdAt, cursor.id));
    }
    const snapshot = await getDocs(usersQuery);
    const items = snapshot.docs.map((documentSnapshot) =>
      mapUserDocument(documentSnapshot.id, documentSnapshot.data()),
    );
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

  async listUsers({ pageSize = 50 } = {}) {
    const page = await this.listUsersPage({ pageSize });
    return page.items;
  }

  async getUserProfile({ userId }) {
    const { db } = getFirebaseServices();
    const userSnapshot = await getDoc(doc(db, "users", userId));

    if (!userSnapshot.exists()) {
      throw new Error("User was not found.");
    }

    const user = mapUserDocument(userSnapshot.id, userSnapshot.data());
    const [documents, payments] = await Promise.all([
      getUserDocuments(db, user.uid || user.id),
      getUserPayments(db, user.uid || user.id),
    ]);

    return {
      documents,
      payments,
      user,
    };
  }

  async deleteUser({ userId }) {
    const { auth } = getFirebaseServices();
    const apiBaseUrl = getAdminApiBaseUrl();

    if (!apiBaseUrl) {
      throw createDeleteError("delete-service-unavailable", "Delete service is not configured.");
    }

    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      throw createDeleteError("permission-denied", "Admin session is required.");
    }

    let response;
    try {
      response = await fetch(
        `${apiBaseUrl}/api/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
    } catch {
      throw createDeleteError("delete-service-unavailable", "Delete service is unavailable.");
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const errorCode = response.status === 401 || response.status === 403
        ? "permission-denied"
        : "delete-service-unavailable";

      throw createDeleteError(errorCode, payload?.message || "Unable to delete user.");
    }
  }

  async updateUser({ userId, user }) {
    const { db } = getFirebaseServices();
    const userRef = doc(db, "users", userId);
    const batch = writeBatch(db);
    const payload = {
      displayName: user.displayName.trim(),
      isActive: Boolean(user.isActive),
      role: user.role,
      ...(typeof user.subscriptionPlan !== "undefined" ? { subscriptionPlan: user.subscriptionPlan } : {}),
      ...(user.subscriptionExpiresAt ? { subscriptionExpiresAt: user.subscriptionExpiresAt } : {}),
      updatedAt: serverTimestamp(),
    };

    batch.set(userRef, payload, { merge: true });

    if (user.orgId) {
      const memberRef = doc(db, "orgs", user.orgId, "members", user.uid || userId);
      batch.set(
        memberRef,
        {
          displayName: payload.displayName,
          email: String(user.email ?? "").trim(),
          photoUrl: String(user.photoUrl ?? "").trim(),
          phone: String(user.phone ?? "").trim(),
          status: payload.isActive ? "active" : "inactive",
          role: user.role === "org_owner" ? "owner" : "member",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();

    return {
      ...user,
      displayName: payload.displayName,
      isActive: payload.isActive,
      role: payload.role,
      updatedAt: new Date(),
    };
  }
}

function getAdminApiBaseUrl() {
  return import.meta.env.VITE_DOCSCHAIN_API_BASE_URL?.replace(/\/+$/, "") || "";
}

function createDeleteError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function getUserDocuments(db, uid) {
  const snapshot = await getDocs(
    query(
      collection(db, "documents"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(6),
    ),
  );

  return snapshot.docs.map((documentSnapshot) =>
    mapDocument(documentSnapshot.id, documentSnapshot.data()),
  );
}

async function getUserPayments(db, uid) {
  const snapshot = await getDocs(
    query(
      collection(db, "payments"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(7),
    ),
  );

  return snapshot.docs.map((documentSnapshot) =>
    mapPayment(documentSnapshot.id, documentSnapshot.data()),
  );
}

function mapDocument(id, data) {
  return {
    id,
    createdAt: toDate(data.createdAt) || toDate(data.updatedAt),
    fileName: data.fileName ?? "",
    fileType: data.fileType ?? "",
    fileUrl: data.fileUrl ?? "",
    status: data.status ?? "",
    title: data.title ?? data.fileName ?? "Document",
  };
}

function mapPayment(id, data) {
  return {
    id,
    amount: data.amount ?? data.total ?? data.price ?? 0,
    createdAt: toDate(data.createdAt) || toDate(data.paidAt),
    invoice: data.invoiceNumber ?? data.invoiceId ?? data.reference ?? id,
    status: data.status ?? "",
  };
}

function mapUserDocument(id, data) {
  return {
    id,
    activeOrg: data.activeOrg ?? null,
    authProvider: data.authProvider ?? "",
    contractAddress: data.contractAddress ?? "",
    contractDeploymentId: data.contractDeploymentId ?? "",
    contractState: data.contractState ?? "",
    createdAt: toDate(data.createdAt),
    displayName: data.displayName ?? "",
    email: data.email ?? "",
    emailVerified: Boolean(data.emailVerified),
    isActive: Boolean(data.isActive),
    lastLoginAt: toDate(data.lastLoginAt),
    orgId: data.orgId ?? null,
    photoUrl: data.photoUrl ?? "",
    role: data.role ?? "",
    subscriptionPlan: data.subscriptionPlan ?? "",
    subscriptionExpiresAt: toDate(data.subscriptionExpiresAt) || toDate(data.subscriptionExpiry) || toDate(data.subscriptionEndDate),
    uid: data.uid ?? id,
    updatedAt: toDate(data.updatedAt),
    verifiedAt: toDate(data.verifiedAt),
    walletAddress: data.walletAddress ?? "",
    walletId: data.walletId ?? "",
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}
