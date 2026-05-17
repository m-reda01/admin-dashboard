import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

export class FirebaseOrganizationsRepository {
  async updateOrganization({ orgId, organization }) {
    if (!orgId) throw new Error("Organization id is required.");
    const name = String(organization?.name ?? "").trim();
    if (!name) throw new Error("Organization name is required.");
    const { db } = getFirebaseServices();
    const ref = doc(db, "orgs", orgId);
    const description = String(organization?.description ?? "").trim();
    const logoUrl = String(organization?.logoUrl ?? "").trim();
    await updateDoc(ref, {
      name,
      displayName: name,
      description,
      isActive: organization?.isActive !== false,
      logoUrl,
      updatedAt: serverTimestamp(),
    });
    return this.getOrganization({ orgId });
  }

  async getOrganization({ orgId }) {
    if (!orgId) {
      throw new Error("Organization id is required.");
    }
    const { db } = getFirebaseServices();
    const snap = await getDoc(doc(db, "orgs", orgId));
    if (!snap.exists()) {
      throw new Error("Organization was not found.");
    }
    const org = mapOrganizationDocument(snap.id, snap.data());
    const membersCount = resolveMembersCount(org);
    const ownerExtras = await fetchOwnerBlockchainSnapshot(db, org.ownerUid);
    return { ...org, membersCount, ...ownerExtras };
  }

  async listOrganizationMembers({ orgId, pageSize = 200 } = {}) {
    if (!orgId) throw new Error("Organization id is required.");
    const { db } = getFirebaseServices();
    const safeLimit = Math.min(Math.max(Number(pageSize) || 200, 1), 500);
    const snapshot = await getDocs(query(collection(db, "orgs", orgId, "members"), limit(safeLimit)));
    return snapshot.docs.map((memberSnap) => mapOrgMemberDocument(memberSnap.id, memberSnap.data()));
  }

  /**
   * Subscriptions are top-level `subscriptions/{customerId}` (doc id is source of truth).
   */
  async listOrganizationSubscriptions({ orgId, ownerUid } = {}) {
    const id = String(orgId ?? "").trim();
    const uid = String(ownerUid ?? "").trim();
    if (!id && !uid) return [];
    const { db } = getFirebaseServices();
    try {
      const direct = id ? await getDoc(doc(db, "subscriptions", id)) : null;
      if (direct?.exists()) {
        return [mapSubscriptionDocument(direct.id, direct.data())];
      }
      // Migration fallback only: legacy organization subscriptions used owner uid.
      const legacy = uid ? await getDoc(doc(db, "subscriptions", uid)) : null;
      if (!legacy?.exists()) {
        return [];
      }
      const row = mapSubscriptionDocument(legacy.id, legacy.data());
      if (row.customerType === "organization" || row.orgId === id || legacy.id === uid || !id) {
        return [row];
      }
      return [];
    } catch {
      return [];
    }
  }

  async listOrganizationsPage({
    pageSize = 50,
    withMembersCount = true,
    cursor = null,
  } = {}) {
    const { db } = getFirebaseServices();
    const safeLimit = Math.min(Math.max(pageSize, 1), 500);
    let orgsQuery = query(
      collection(db, "orgs"),
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      limit(safeLimit),
    );
    if (cursor?.createdAt && cursor?.id) {
      orgsQuery = query(orgsQuery, startAfter(cursor.createdAt, cursor.id));
    }
    const snapshot = await getDocs(orgsQuery);

    const items = snapshot.docs.map((documentSnapshot) => {
      const org = mapOrganizationDocument(documentSnapshot.id, documentSnapshot.data());
      if (!withMembersCount) {
        return org;
      }
      return {
        ...org,
        membersCount: resolveMembersCount(org),
      };
    });
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

  async listOrganizations({ pageSize = 50, withMembersCount = true } = {}) {
    const page = await this.listOrganizationsPage({ pageSize, withMembersCount });
    return page.items;
  }

  async getOrganizationMembersCount({ orgId, useCacheField = true } = {}) {
    const id = String(orgId ?? "").trim();
    if (!id) return 0;
    const { db } = getFirebaseServices();
    if (useCacheField) {
      const snap = await getDoc(doc(db, "orgs", id));
      if (snap.exists()) {
        const data = mapOrganizationDocument(snap.id, snap.data());
        const cachedCount = resolveMembersCount(data);
        if (cachedCount > 0) {
          return cachedCount;
        }
      }
    }
    return getOrganizationMembersCount(db, id);
  }
}

async function getOrganizationMembersCount(db, orgId) {
  try {
    const snapshot = await getCountFromServer(collection(db, "orgs", orgId, "members"));
    return snapshot.data().count || 0;
  } catch {
    return 0;
  }
}

async function fetchOwnerBlockchainSnapshot(db, ownerUid) {
  const uid = String(ownerUid ?? "").trim();
  if (!uid) {
    return {
      ownerWalletAddress: "",
      ownerContractAddress: "",
      ownerContractDeploymentId: "",
      ownerContractState: "",
    };
  }
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) {
      return {
        ownerWalletAddress: "",
        ownerContractAddress: "",
        ownerContractDeploymentId: "",
        ownerContractState: "",
      };
    }
    const d = userSnap.data();
    return {
      ownerWalletAddress: String(d.walletAddress ?? "").trim(),
      ownerContractAddress: String(d.contractAddress ?? "").trim(),
      ownerContractDeploymentId: String(d.contractDeploymentId ?? "").trim(),
      ownerContractState: String(d.contractState ?? "").trim(),
    };
  } catch {
    return {
      ownerWalletAddress: "",
      ownerContractAddress: "",
      ownerContractDeploymentId: "",
      ownerContractState: "",
    };
  }
}

function mapOrgMemberDocument(uid, data) {
  return {
    uid,
    orgId: data.orgId ?? "",
    role: data.role ?? "member",
    status: data.status ?? "",
    displayName: data.displayName ?? "",
    email: data.email ?? "",
    photoUrl: data.photoUrl ?? "",
    emailVerified: Boolean(data.emailVerified),
    joinedAt: toDate(data.joinedAt),
    invitedAt: toDate(data.invitedAt),
    lastLoginAt: toDate(data.lastLoginAt),
    isDeleted: Boolean(data.isDeleted),
  };
}

function toInt64(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapSubscriptionDocument(id, data) {
  return {
    id,
    customerType: String(data.customerType ?? "").trim(),
    certificationsLimit: toInt64(data.certificationsLimit),
    certificationsUsed: toInt64(data.certificationsUsed),
    createdAt: toDate(data.createdAt),
    currentMembersCount: toInt64(data.currentMembersCount),
    customerId: String(data.customerId ?? "").trim(),
    orgId: String(data.orgId ?? "").trim(),
    ownerUid: String(data.ownerUid ?? "").trim(),
    endDate: toDate(data.endDate),
    extraCertificationsAmount: toInt64(data.extraCertificationsAmount),
    extraCertificationsCount: toInt64(data.extraCertificationsCount),
    extraMembersAmount: toInt64(data.extraMembersAmount),
    extraMembersCount: toInt64(data.extraMembersCount),
    lastModified: toDate(data.lastModified),
    membersLimit: toInt64(data.membersLimit),
    packageId: String(data.packageId ?? "").trim(),
    packageName: String(data.packageName ?? "").trim(),
    paymentId: String(data.paymentId ?? "").trim(),
    paymentRecordId: String(data.paymentRecordId ?? "").trim(),
    period: String(data.period ?? "").trim(),
    price: toInt64(data.price),
    startDate: toDate(data.startDate),
    status: String(data.status ?? "").trim(),
  };
}

function mapOrganizationDocument(id, data) {
  return {
    id,
    createdAt: toDate(data.createdAt) || toDate(data.updatedAt),
    description: data.description ?? "",
    isActive: data.isActive !== false,
    logoUrl: data.logoUrl ?? "",
    name: data.name ?? data.displayName ?? "Organization",
    orgId: data.orgId ?? id,
    ownerUid: String(data.ownerUid ?? data.ownerId ?? "").trim(),
    planId: String(data.planId ?? "").trim(),
    quotaTotalDocs: Number(data.quotaTotalDocs ?? 0),
    quotaUsedDocs: Number(data.quotaUsedDocs ?? 0),
    membersCount: Number(data.membersCount ?? data.currentMembersCount ?? 0),
    contractAddress: String(data.contractAddress ?? "").trim(),
    deploymentId: String(data.deploymentId ?? data.contractDeploymentId ?? "").trim(),
    contractStatus: String(data.contractStatus ?? data.contractState ?? "").trim(),
  };
}

function resolveMembersCount(org) {
  const count = Number(org?.membersCount ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}
