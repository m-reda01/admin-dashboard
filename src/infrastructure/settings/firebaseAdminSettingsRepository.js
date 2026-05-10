import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseServices } from "../firebase/firebaseClient.js";

const SETTINGS_COLLECTION = "admin_settings";
const SETTINGS_DOC_ID = "general";

export class FirebaseAdminSettingsRepository {
  async getSettings() {
    const { db } = getFirebaseServices();
    const snapshot = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    if (!snapshot.exists()) return defaultSettings();
    return mapSettings(snapshot.data());
  }

  async updateSettings(payload) {
    const { db } = getFirebaseServices();
    const next = mapWritePayload(payload);
    await setDoc(
      doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID),
      {
        ...next,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return next;
  }
}

function defaultSettings() {
  return {
    platformName: "DocsChain",
    supportEmail: "",
    supportPhone: "",
    maintenanceMode: false,
    maintenanceMessage: "",
  };
}

function mapSettings(data) {
  const defaults = defaultSettings();
  return {
    ...defaults,
    platformName: typeof data?.platformName === "string" ? data.platformName : defaults.platformName,
    supportEmail: typeof data?.supportEmail === "string" ? data.supportEmail : defaults.supportEmail,
    supportPhone: typeof data?.supportPhone === "string" ? data.supportPhone : defaults.supportPhone,
    maintenanceMode: data?.maintenanceMode === true,
    maintenanceMessage: typeof data?.maintenanceMessage === "string" ? data.maintenanceMessage : defaults.maintenanceMessage,
  };
}

function mapWritePayload(payload) {
  return {
    platformName: String(payload?.platformName ?? "").trim(),
    supportEmail: String(payload?.supportEmail ?? "").trim().toLowerCase(),
    supportPhone: String(payload?.supportPhone ?? "").trim(),
    maintenanceMode: Boolean(payload?.maintenanceMode),
    maintenanceMessage: String(payload?.maintenanceMessage ?? "").trim(),
  };
}
