import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { isAdminRole } from "../../domain/auth/adminSession.js";
import { getFirebaseServices, getSecondaryProvisioningAuth } from "../firebase/firebaseClient.js";

export class FirebaseAdminsRepository {
  async listAdmins() {
    const { db } = getFirebaseServices();
    const snapshot = await getDocs(collection(db, "admins"));
    const rows = snapshot.docs.map((d) => normalizeAdminDoc(d.id, d.data()));
    rows.sort((a, b) => String(a.email || "").localeCompare(String(b.email || ""), undefined, { sensitivity: "base" }));
    return rows;
  }

  /**
   * Creates Firebase Auth user (secondary app instance, keeps current admin signed in),
   * then writes Firestore `admins/{uid}`.
   */
  async createAdmin({ email, password, displayName, adminRole }) {
    if (!isAdminRole(adminRole)) {
      throw new Error("Invalid admin role.");
    }
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new Error("Invalid email.");
    }
    const pwd = String(password || "");
    if (pwd.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const secondaryAuth = getSecondaryProvisioningAuth();
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, pwd);
    } catch (e) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        throw new Error("This email is already registered in Firebase Auth.");
      }
      throw e;
    } finally {
      await signOut(secondaryAuth).catch(() => {});
    }

    const uid = credential.user.uid;
    const { db } = getFirebaseServices();
    const name = String(displayName || "").trim() || normalizedEmail;

    await setDoc(doc(db, "admins", uid), {
      uid,
      email: normalizedEmail,
      displayName: name,
      adminRole,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: null,
    });

    return { uid };
  }

  async updateAdmin(adminUid, { displayName, adminRole, isActive }) {
    if (!adminUid) throw new Error("Missing admin id.");
    const { db } = getFirebaseServices();
    const adminRef = await resolveAdminDocRefByUid(db, adminUid);
    if (!adminRef) {
      throw new Error("Admin profile was not found in Firestore.");
    }
    const patch = { updatedAt: serverTimestamp() };
    if (displayName !== undefined) patch.displayName = String(displayName || "").trim();
    if (adminRole !== undefined) {
      if (!isAdminRole(adminRole)) throw new Error("Invalid admin role.");
      patch.adminRole = adminRole;
    }
    if (isActive !== undefined) patch.isActive = Boolean(isActive);
    await updateDoc(adminRef, patch);
  }

  async deleteAdmin(adminUid) {
    if (!adminUid) throw new Error("Missing admin id.");
    const { db } = getFirebaseServices();
    const adminRef = await resolveAdminDocRefByUid(db, adminUid);
    if (!adminRef) {
      throw new Error("Admin profile was not found in Firestore.");
    }
    await deleteDoc(adminRef);
    /** Auth user may still exist — remove via Firebase Console or a Callable using Admin SDK. */
  }
}

function normalizeAdminDoc(documentId, data) {
  const uid = typeof data?.uid === "string" ? data.uid : documentId;
  return {
    id: documentId,
    uid,
    email: typeof data?.email === "string" ? data.email : "",
    displayName: typeof data?.displayName === "string" ? data.displayName : "",
    adminRole: typeof data?.adminRole === "string" ? data.adminRole : "",
    isActive: data?.isActive === true,
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
    lastLoginAt: data?.lastLoginAt ?? null,
  };
}

async function resolveAdminDocRefByUid(db, adminUid) {
  const directRef = doc(db, "admins", adminUid);
  const directSnapshot = await getDoc(directRef);
  if (directSnapshot.exists()) return directRef;

  const byUidQuery = query(collection(db, "admins"), where("uid", "==", adminUid), limit(1));
  const byUidSnapshot = await getDocs(byUidQuery);
  if (!byUidSnapshot.empty) return byUidSnapshot.docs[0].ref;

  return null;
}
