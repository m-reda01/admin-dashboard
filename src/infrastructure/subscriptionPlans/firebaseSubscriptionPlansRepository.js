import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

const COLLECTION = "subscription_packages";

export class FirebaseSubscriptionPlansRepository {
  async listPlans() {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, COLLECTION));
    const rows = snapshot.docs.map((documentSnapshot) =>
      mapPlanDocument(documentSnapshot.id, documentSnapshot.data()),
    );
    rows.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.name.localeCompare(b.name));
    return rows;
  }

  async createPlan(planPayload) {
    const { db } = getFirebaseServices();
    const colRef = collection(db, COLLECTION);
    const writeData = buildFirestoreFields(planPayload);
    const docRef = await addDoc(colRef, {
      ...writeData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(docRef, { id: docRef.id });
    return mapPlanDocument(docRef.id, { ...writeData, id: docRef.id });
  }

  async updatePlan(planId, planPayload) {
    const { db } = getFirebaseServices();
    const docRef = doc(db, COLLECTION, planId);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      throw new Error("Subscription plan not found.");
    }
    const existingData = existing.data() ?? {};
    if (String(existingData.lifecycleStatus ?? "").toLowerCase() === "retired") {
      throw new Error("Retired plans cannot be modified.");
    }
    const writeData = buildFirestoreFields(planPayload);
    await updateDoc(docRef, {
      ...writeData,
      id: planId,
      updatedAt: serverTimestamp(),
    });
    return mapPlanDocument(planId, { ...writeData, id: planId });
  }

  async deletePlan(planId) {
    const id = String(planId ?? "").trim();
    if (!id) throw new Error("Subscription plan id is required.");
    const { db } = getFirebaseServices();
    const docRef = doc(db, COLLECTION, id);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      throw new Error("Subscription plan not found.");
    }
    const before = mapPlanDocument(existing.id, existing.data());
    const after = {
      ...before,
      isActive: false,
      lifecycleStatus: "retired",
      retiredAt: new Date(),
      updatedAt: new Date(),
    };
    await updateDoc(docRef, {
      isActive: false,
      lifecycleStatus: "retired",
      retiredAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { before, after };
  }
}

function buildFirestoreFields(payload) {
  const currency = String(payload.billing?.monthly?.currency ?? payload.currency ?? "SAR").trim() || "SAR";
  const monthlyAmount = Number(payload.billing?.monthly?.amount ?? 0);
  const audience = String(payload.audience ?? "individual").trim().toLowerCase();
  const certificationsLimit = Number(payload.limits?.certifications ?? 0);
  const membersLimit = Number(payload.limits?.members ?? 0);
  const certificationUnitPrice = Number(payload.extras?.certificationUnitPrice ?? 0);
  const memberUnitPrice = Number(payload.extras?.memberUnitPrice ?? 0);
  const features = Array.isArray(payload.features) ? payload.features.map(String) : [];
  const lifecycleStatus = String(payload.lifecycleStatus ?? "active").toLowerCase();
  const isActive = payload.isActive !== false && lifecycleStatus !== "retired";
  return {
    name: String(payload.name ?? "").trim(),
    description: String(payload.description ?? "").trim(),
    isRecommended: Boolean(payload.isRecommended),
    tag: String(payload.tag ?? "").trim(),
    sortOrder: Number(payload.sortOrder ?? 0),
    features,
    schemaVersion: 2,
    isActive,
    lifecycleStatus,
    billing: {
      monthly: {
        amount: monthlyAmount,
        currency,
      },
    },
    limits: {
      certifications: certificationsLimit,
      members: membersLimit,
    },
    extras: {
      certificationUnitPrice,
      memberUnitPrice,
    },
    audience,
    retiredAt: lifecycleStatus === "retired" ? serverTimestamp() : null,
  };
}

function mapPlanDocument(id, data) {
  const billing = data.billing && typeof data.billing === "object" ? data.billing : {};
  const monthly = billing.monthly && typeof billing.monthly === "object" ? billing.monthly : {};
  const limits = data.limits && typeof data.limits === "object" ? data.limits : {};
  const extras = data.extras && typeof data.extras === "object" ? data.extras : {};
  return {
    id,
    createdAt: toDate(data.createdAt),
    description: data.description ?? "",
    extras: {
      certificationUnitPrice: Number(extras.certificationUnitPrice ?? 0),
      memberUnitPrice: Number(extras.memberUnitPrice ?? 0),
    },
    features: Array.isArray(data.features) ? [...data.features] : [],
    isRecommended: data.isRecommended === true,
    name: data.name ?? "",
    billing: {
      monthly: {
        amount: Number(monthly.amount ?? 0),
        currency: monthly.currency ?? "SAR",
      },
    },
    sortOrder: Number(data.sortOrder ?? 0),
    tag: data.tag ?? "",
    audience: data.audience ?? "individual",
    schemaVersion: Number(data.schemaVersion ?? 2),
    isActive: data.isActive !== false,
    lifecycleStatus: String(data.lifecycleStatus ?? "active"),
    updatedAt: toDate(data.updatedAt),
    retiredAt: toDate(data.retiredAt),
    limits: {
      certifications: Number(limits.certifications ?? 0),
      members: Number(limits.members ?? 0),
    },
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}
