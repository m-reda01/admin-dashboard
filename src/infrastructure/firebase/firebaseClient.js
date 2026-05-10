import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/** Secondary Firebase App — used only to create Auth users without switching the signed-in admin session. */
const ADMIN_PROVISIONING_APP_NAME = "docschain-admin-provisioning";

const firebaseConfig = {
  apiKey: getRequiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getRequiredEnv("VITE_FIREBASE_APP_ID"),
};

export function getFirebaseServices() {
  assertFirebaseConfig();

  const app = getApps().length ? getApp() : initializeApp(unwrapFirebaseConfig());

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

export function getSecondaryProvisioningAuth() {
  assertFirebaseConfig();
  const cfg = unwrapFirebaseConfig();
  const apps = getApps();
  const existing = apps.find((a) => a.name === ADMIN_PROVISIONING_APP_NAME);
  const secondaryApp = existing || initializeApp(cfg, ADMIN_PROVISIONING_APP_NAME);
  return getAuth(secondaryApp);
}

function assertFirebaseConfig() {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, item]) => !item.value)
    .map(([, item]) => item.envKey);

  if (missingKeys.length) {
    throw new Error(
      `Firebase config is missing: ${missingKeys.join(", ")}. Add it to .env.local and restart Vite.`,
    );
  }
}

function getRequiredEnv(envKey) {
  return {
    envKey,
    value: import.meta.env[envKey],
  };
}

function unwrapFirebaseConfig() {
  return Object.fromEntries(
    Object.entries(firebaseConfig).map(([key, item]) => [key, item.value]),
  );
}
