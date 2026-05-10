import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
    const writeData = buildFirestoreFields(planPayload);
    await updateDoc(doc(db, COLLECTION, planId), {
      ...writeData,
      id: planId,
      updatedAt: serverTimestamp(),
    });
    return mapPlanDocument(planId, { ...writeData, id: planId });
  }

  async deletePlan(planId) {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, COLLECTION, planId));
  }
}

function buildFirestoreFields(payload) {
  return {
    name: String(payload.name ?? "").trim(),
    description: String(payload.description ?? "").trim(),
    price: Number(payload.price ?? 0),
    currency: String(payload.currency ?? "SAR").trim(),
    period: String(payload.period ?? "monthly"),
    target: String(payload.target ?? "individual"),
    isRecommended: Boolean(payload.isRecommended),
    tag: String(payload.tag ?? "").trim(),
    sortOrder: Number(payload.sortOrder ?? 0),
    certificationsLimit: Number(payload.certificationsLimit ?? 0),
    membersLimit: Number(payload.membersLimit ?? 0),
    features: Array.isArray(payload.features) ? payload.features.map(String) : [],
    extraPrices: {
      certification: Number(payload.extraPrices?.certification ?? 0),
      member: Number(payload.extraPrices?.member ?? 0),
    },
  };
}

function mapPlanDocument(id, data) {
  const ep = data.extraPrices && typeof data.extraPrices === "object" ? data.extraPrices : {};
  return {
    id,
    certificationsLimit: Number(data.certificationsLimit ?? 0),
    createdAt: toDate(data.createdAt),
    currency: data.currency ?? "SAR",
    description: data.description ?? "",
    extraPrices: {
      certification: Number(ep.certification ?? 0),
      member: Number(ep.member ?? 0),
    },
    features: Array.isArray(data.features) ? [...data.features] : [],
    isRecommended: data.isRecommended === true,
    membersLimit: Number(data.membersLimit ?? 0),
    name: data.name ?? "",
    period: data.period ?? "monthly",
    price: Number(data.price ?? 0),
    sortOrder: Number(data.sortOrder ?? 0),
    tag: data.tag ?? "",
    target: data.target ?? "individual",
    updatedAt: toDate(data.updatedAt),
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}
