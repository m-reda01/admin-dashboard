import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
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
    const membersCount = await getOrganizationMembersCount(db, org.id);
    const ownerExtras = await fetchOwnerBlockchainSnapshot(db, org.ownerUid);
    return { ...org, membersCount, ...ownerExtras };
  }

  async listOrganizationMembers({ orgId }) {
    if (!orgId) throw new Error("Organization id is required.");
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, "orgs", orgId, "members"));
    return snapshot.docs.map((memberSnap) => mapOrgMemberDocument(memberSnap.id, memberSnap.data()));
  }

  /**
   * Subscriptions are top-level `subscriptions/{customerId}` (same as Flutter wallet).
   * Fallback: query by `customerId` if the doc id differs.
   */
  async listOrganizationSubscriptions({ ownerUid }) {
    const uid = String(ownerUid ?? "").trim();
    if (!uid) return [];
    const { db } = getFirebaseServices();
    try {
      const direct = await getDoc(doc(db, "subscriptions", uid));
      if (direct.exists()) {
        return [mapSubscriptionDocument(direct.id, direct.data())];
      }
      const snapshot = await getDocs(
        query(collection(db, "subscriptions"), where("customerId", "==", uid), limit(25)),
      );
      return snapshot.docs.map((s) => mapSubscriptionDocument(s.id, s.data()));
    } catch {
      return [];
    }
  }

  async listOrganizations({ pageSize = 50, withMembersCount = true } = {}) {
    const { db } = getFirebaseServices();
    const orgsQuery = query(
      collection(db, "orgs"),
      orderBy("createdAt", "desc"),
      limit(pageSize),
    );
    const snapshot = await getDocs(orgsQuery);

    if (!withMembersCount) {
      return snapshot.docs.map((documentSnapshot) =>
        mapOrganizationDocument(documentSnapshot.id, documentSnapshot.data()),
      );
    }

    return Promise.all(
      snapshot.docs.map(async (documentSnapshot) => {
        const org = mapOrganizationDocument(documentSnapshot.id, documentSnapshot.data());
        const membersCount = await getOrganizationMembersCount(db, org.id);

        return {
          ...org,
          membersCount,
        };
      }),
    );
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
    certificationsLimit: toInt64(data.certificationsLimit),
    certificationsUsed: toInt64(data.certificationsUsed),
    createdAt: toDate(data.createdAt),
    currentMembersCount: toInt64(data.currentMembersCount),
    customerId: String(data.customerId ?? "").trim(),
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
    contractAddress: String(data.contractAddress ?? "").trim(),
    deploymentId: String(data.deploymentId ?? data.contractDeploymentId ?? "").trim(),
    contractStatus: String(data.contractStatus ?? data.contractState ?? "").trim(),
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}
