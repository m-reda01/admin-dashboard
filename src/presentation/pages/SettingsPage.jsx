import React, { useEffect, useMemo, useState } from "react";
import { CircleAlert, KeyRound, Shield, UserRound } from "lucide-react";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { canMutateAdmins, canViewAdminsPage } from "../../domain/auth/adminPermissions.js";

export function SettingsPage({
  onNavigate,
  sendPasswordResetUseCase,
  session,
  updateAdminUseCase,
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("personal");
  const [personalForm, setPersonalForm] = useState({ firstName: "", lastName: "", email: "" });
  const [initialPersonalForm, setInitialPersonalForm] = useState({ firstName: "", lastName: "", email: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [alert, setAlert] = useState(null);
  const mayMutate = canMutateAdmins(session?.adminRole);
  const personalDirty = useMemo(
    () =>
      personalForm.firstName !== initialPersonalForm.firstName ||
      personalForm.lastName !== initialPersonalForm.lastName,
    [initialPersonalForm.firstName, initialPersonalForm.lastName, personalForm.firstName, personalForm.lastName],
  );

  useEffect(() => {
    if (!canViewAdminsPage(session?.adminRole)) {
      onNavigate("/dashboard");
      return;
    }
    const parsed = parseDisplayName(session?.displayName, session?.email);
    const base = {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: session?.email || "",
    };
    setPersonalForm(base);
    setInitialPersonalForm(base);
  }, [onNavigate, session?.adminRole, session?.displayName, session?.email]);

  async function handleSavePersonal(event) {
    event.preventDefault();
    if (!mayMutate) return;
    const displayName = `${personalForm.firstName} ${personalForm.lastName}`.trim();
    if (!displayName) {
      setAlert({ variant: "error", message: t("settingsPage.validation.displayNameRequired") });
      return;
    }
    setIsSaving(true);
    try {
      await updateAdminUseCase.execute({
        actorRole: session?.adminRole,
        actorUid: session?.uid,
        targetUid: session?.uid,
        displayName,
        adminRole: session?.adminRole,
        isActive: session?.isActive !== false,
      });
      setInitialPersonalForm((prev) => ({ ...prev, firstName: personalForm.firstName, lastName: personalForm.lastName }));
      setAlert({ variant: "success", message: t("settingsPage.personalSaved") });
    } catch (error) {
      setAlert({ variant: "error", message: error?.message || t("settingsPage.personalSaveError") });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendReset() {
    if (!session?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetUseCase.execute({ email: session.email });
      setResetModal({
        email: session.email,
        token: Math.random().toString(36).slice(2, 9),
      });
    } catch (error) {
      setAlert({ variant: "error", message: error?.message || t("settingsPage.resetError") });
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <DashboardLayout activePage="settings" onNavigate={onNavigate} session={session} title={t("settingsPage.title")}>
      <div className="dashboard-content users-management-page settings-page" data-testid="settings-page">
        <AppAlert message={alert?.message} onClose={() => setAlert(null)} variant={alert?.variant} />
        <div className="settings-layout-shell">
          <aside className="settings-side-tabs">
            <button
              type="button"
              className={`settings-side-tab ${activeTab === "personal" ? "is-active" : ""}`}
              data-testid="settings-tab-personal"
              onClick={() => setActiveTab("personal")}
            >
              <UserRound size={14} />
              {t("settingsPage.tabs.personal")}
            </button>
            <button
              type="button"
              className={`settings-side-tab ${activeTab === "protection" ? "is-active" : ""}`}
              data-testid="settings-tab-protection"
              onClick={() => setActiveTab("protection")}
            >
              <Shield size={14} />
              {t("settingsPage.tabs.protection")}
            </button>
          </aside>

          <div className="settings-content-pane">
            {activeTab === "personal" ? (
              <form className="settings-personal-form" noValidate onSubmit={handleSavePersonal}>
                <h2 className="settings-section-title">
                  <UserRound size={18} />
                  {t("settingsPage.personalTitle")}
                </h2>
                {!mayMutate ? <p className="admins-read-only-hint">{t("settingsPage.readOnlyHint")}</p> : null}
                <div className="settings-grid">
                  <label className="settings-field">
                    <span>{t("settingsPage.fields.firstName")}</span>
                    <input
                      type="text"
                      value={personalForm.firstName}
                      data-testid="settings-first-name"
                      disabled={!mayMutate}
                      onChange={(e) => setPersonalForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    />
                  </label>
                  <label className="settings-field">
                    <span>{t("settingsPage.fields.lastName")}</span>
                    <input
                      type="text"
                      value={personalForm.lastName}
                      data-testid="settings-last-name"
                      disabled={!mayMutate}
                      onChange={(e) => setPersonalForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    />
                  </label>
                  <label className="settings-field settings-field--full">
                    <span>{t("settingsPage.fields.email")}</span>
                    <input type="email" value={personalForm.email} data-testid="settings-email" disabled />
                  </label>
                </div>
                <div className="settings-actions">
                  <button
                    type="button"
                    className="confirm-dialog-button confirm-dialog-button--neutral"
                    data-testid="settings-discard"
                    disabled={!personalDirty || !mayMutate}
                    onClick={() => setPersonalForm(initialPersonalForm)}
                  >
                    {t("settingsPage.discard")}
                  </button>
                  <button
                    type="submit"
                    className="confirm-dialog-button confirm-dialog-button--primary"
                    data-testid="settings-confirm"
                    disabled={!mayMutate || !personalDirty || isSaving}
                  >
                    {isSaving ? t("settingsPage.saving") : t("settingsPage.confirm")}
                  </button>
                </div>
              </form>
            ) : (
              <section className="settings-protection">
                <h2 className="settings-section-title">
                  <Shield size={18} />
                  {t("settingsPage.protectionTitle")}
                </h2>
                <div className="settings-protection-card">
                  <h3>
                    <KeyRound size={16} />
                    {t("settingsPage.passwordModification")}
                  </h3>
                  <p>{t("settingsPage.passwordHelp")}</p>
                  <p className="settings-password-note">
                    <CircleAlert size={14} />
                    {t("settingsPage.passwordUpdatedAt")}
                  </p>
                  <button
                    type="button"
                    className="settings-reset-button"
                    data-testid="settings-reset-password"
                    disabled={isSendingReset}
                    onClick={handleSendReset}
                  >
                    {isSendingReset ? t("settingsPage.sending") : t("settingsPage.resetPassword")}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        {resetModal ? (
          <div className="confirm-dialog-backdrop" role="presentation" data-testid="settings-reset-modal-backdrop" onMouseDown={() => setResetModal(null)}>
            <div className="confirm-dialog settings-reset-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <button type="button" className="settings-reset-close" data-testid="settings-reset-modal-close" onClick={() => setResetModal(null)}>
                ×
              </button>
              <h2>{t("settingsPage.resetModalTitle")}</h2>
              <p className="settings-reset-token">{resetModal.token}</p>
              <p>{t("settingsPage.resetModalDescription", { email: resetModal.email })}</p>
              <div className="confirm-dialog-actions">
                <button type="button" className="confirm-dialog-button confirm-dialog-button--primary" data-testid="settings-reset-modal-confirm" onClick={() => setResetModal(null)}>
                  {t("settingsPage.sendEmail")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function parseDisplayName(displayName, fallbackEmail) {
  const safe = String(displayName || "").trim();
  if (!safe) {
    return {
      firstName: String(fallbackEmail || "").split("@")[0] || "",
      lastName: "",
    };
  }
  const parts = safe.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}
