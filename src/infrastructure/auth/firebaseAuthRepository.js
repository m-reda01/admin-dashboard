import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  validateAdminDocument,
  validateAdminPasswordResetDocument,
} from "../../domain/auth/adminAccess.js";
import { createAdminSession } from "../../domain/auth/adminSession.js";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

export class FirebaseAuthRepository {
  subscribeToSession(onSession, onError) {
    const { auth, db } = getFirebaseServices();

    return onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          onSession(null);
          return;
        }

        try {
          const adminProfile = await findAdminProfile(db, user.uid);
          validateAdminDocument(adminProfile.data, user.uid);

          onSession(
            createAdminSession({
              uid: user.uid,
              email: adminProfile.data.email || user.email,
              displayName: adminProfile.data.displayName || user.displayName || user.email,
              photoURL: user.photoURL || "",
              adminRole: adminProfile.data.adminRole,
              isActive: adminProfile.data.isActive,
            }),
          );
        } catch (error) {
          await firebaseSignOut(auth);
          onError?.(error);
          onSession(null);
        }
      },
      (error) => {
        onError?.(error);
        onSession(null);
      },
    );
  }

  async signIn({ email, password, rememberDevice }) {
    const { auth, db } = getFirebaseServices();

    await setPersistence(
      auth,
      rememberDevice ? browserLocalPersistence : browserSessionPersistence,
    );

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    const adminProfile = await findAdminProfile(db, user.uid);

    try {
      validateAdminDocument(adminProfile.data, user.uid);
    } catch (error) {
      await firebaseSignOut(auth);
      throw error;
    }

    updateDoc(adminProfile.ref, { lastLoginAt: serverTimestamp() }).catch(() => {});

    return createAdminSession({
      uid: user.uid,
      email: adminProfile.data.email || user.email,
      displayName: adminProfile.data.displayName || user.displayName || user.email,
      photoURL: user.photoURL || "",
      adminRole: adminProfile.data.adminRole,
      isActive: adminProfile.data.isActive,
    });
  }

  async signOut() {
    const { auth } = getFirebaseServices();
    await firebaseSignOut(auth);
  }

  async sendPasswordResetLink({ email }) {
    const { auth, db } = getFirebaseServices();
    const normalizedEmail = email.trim().toLowerCase();
    const adminProfile = await findAdminProfileByEmail(db, normalizedEmail);

    validateAdminPasswordResetDocument(adminProfile?.data);

    await sendPasswordResetEmail(auth, normalizedEmail);
  }
}

async function findAdminProfile(db, uid) {
  const adminRefById = doc(db, "admins", uid);
  const adminSnapshotById = await getDoc(adminRefById);

  if (adminSnapshotById.exists()) {
    return {
      ref: adminRefById,
      data: adminSnapshotById.data(),
    };
  }

  const adminQuery = query(collection(db, "admins"), where("uid", "==", uid), limit(1));
  const adminQuerySnapshot = await getDocs(adminQuery);

  if (adminQuerySnapshot.empty) {
    return {
      ref: adminRefById,
      data: null,
    };
  }

  const adminDocument = adminQuerySnapshot.docs[0];

  return {
    ref: adminDocument.ref,
    data: adminDocument.data(),
  };
}

async function findAdminProfileByEmail(db, email) {
  const adminQuery = query(collection(db, "admins"), where("email", "==", email), limit(1));
  const adminQuerySnapshot = await getDocs(adminQuery);

  if (adminQuerySnapshot.empty) {
    return null;
  }

  const adminDocument = adminQuerySnapshot.docs[0];

  return {
    ref: adminDocument.ref,
    data: adminDocument.data(),
  };
}
