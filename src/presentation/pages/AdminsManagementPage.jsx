import React, { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminRole } from "../../domain/auth/adminSession.js";
import { canMutateAdmins, canViewAdminsPage } from "../../domain/auth/adminPermissions.js";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { ManagementIndexLayout } from "../layouts/ManagementIndexLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

export function AdminsManagementPage({
  createAdminUseCase,
  deleteAdminUseCase,
  listAdminsUseCase,
  onNavigate,
  sendPasswordResetUseCase,
  session,
  updateAdminUseCase,
}) {
  const { language, t } = useI18n();
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [dialogAdmin, setDialogAdmin] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetBusyUid, setResetBusyUid] = useState(null);

  const mayMutate = canMutateAdmins(session?.adminRole);

  useEffect(() => {
    if (!canViewAdminsPage(session?.adminRole)) {
      onNavigate("/dashboard");
    }
  }, [session?.adminRole, onNavigate]);

  async function reloadAdmins() {
    const rows = await listAdminsUseCase.execute();
    setAdmins(rows);
  }

  useEffect(() => {
    if (!canViewAdminsPage(session?.adminRole)) return undefined;
    let mounted = true;
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        await reloadAdmins();
      } catch (e) {
        if (mounted) setError(e?.message || t("adminsManagement.loadError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [listAdminsUseCase, session?.adminRole, t]);

  const visibleAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((row) => {
      const blob = [row.email, row.displayName, row.adminRole, row.uid].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [admins, searchQuery]);

  function openCreate() {
    setDialogAdmin(emptyAdminForm());
    setDialogMode("create");
  }

  function openEdit(row) {
    setDialogAdmin({
      uid: row.uid,
      email: row.email,
      displayName: row.displayName || "",
      adminRole: row.adminRole || AdminRole.ADMIN,
      isActive: row.isActive !== false,
    });
    setDialogMode("edit");
  }

  async function submitDialog(form) {
    if (!mayMutate) return;
    const v = validateAdminForm(dialogMode, form, t);
    if (v) {
      setAlert({ variant: "error", message: v });
      return;
    }

    setIsSaving(true);
    try {
      if (dialogMode === "create") {
        await createAdminUseCase.execute({
          actorRole: session.adminRole,
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          adminRole: form.adminRole,
        });
        setAlert({ variant: "success", message: t("adminsManagement.createSuccess") });
      } else if (dialogMode === "edit" && form.uid) {
        await updateAdminUseCase.execute({
          actorRole: session.adminRole,
          actorUid: session.uid,
          targetUid: form.uid,
          displayName: form.displayName,
          adminRole: form.adminRole,
          isActive: form.isActive,
        });
        setAlert({ variant: "success", message: t("adminsManagement.updateSuccess") });
      }
      setDialogMode(null);
      setDialogAdmin(null);
      await reloadAdmins();
    } catch (e) {
      setAlert({ variant: "error", message: e?.message || t("adminsManagement.saveError") });
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || !mayMutate) return;
    setIsDeleting(true);
    try {
      await deleteAdminUseCase.execute({
        actorRole: session.adminRole,
        actorUid: session.uid,
        targetUid: pendingDelete.uid,
      });
      setAlert({ variant: "success", message: t("adminsManagement.deleteSuccess") });
      setPendingDelete(null);
      await reloadAdmins();
    } catch (e) {
      setAlert({ variant: "error", message: e?.message || t("adminsManagement.deleteError") });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSendReset(adminRow) {
    if (!mayMutate || !adminRow?.email) return;
    setResetBusyUid(adminRow.uid);
    try {
      await sendPasswordResetUseCase.execute({ email: adminRow.email });
      setAlert({ variant: "success", message: t("adminsManagement.resetSent") });
    } catch (e) {
      setAlert({ variant: "error", message: e?.message || t("adminsManagement.resetError") });
    } finally {
      setResetBusyUid(null);
    }
  }

  return (
    <DashboardLayout activePage="admins" onNavigate={onNavigate} session={session} title={t("adminsManagement.title")}>
      <ManagementIndexLayout
        className="dashboard-content admins-management-page"
        data-testid="admins-management-page"
        toolbarAlert={
          alert ? <AppAlert variant={alert.variant} message={alert.message} onClose={() => setAlert(null)} /> : null
        }
        toolbarActions={
          <>
            <label className="users-search-field">
              <Search size={18} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                placeholder={t("adminsManagement.search")}
                data-testid="admins-search"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            {mayMutate ? (
              <button type="button" className="users-primary-action" data-testid="admins-add" onClick={openCreate}>
                <Plus size={18} aria-hidden />
                {t("adminsManagement.addAdmin")}
              </button>
            ) : null}
          </>
        }
        afterToolbar={
          <>
            {!mayMutate ? <p className="admins-read-only-hint">{t("adminsManagement.readOnlyHint")}</p> : null}
            {error ? (
              <p className="users-error-banner" role="alert">
                {error}
              </p>
            ) : null}
          </>
        }
      >
        <div className="users-table-card">
          <table className="users-table">
            <thead>
              <tr>
                <th>{t("adminsManagement.cols.email")}</th>
                <th>{t("adminsManagement.cols.displayName")}</th>
                <th>{t("adminsManagement.cols.role")}</th>
                <th>{t("adminsManagement.cols.status")}</th>
                <th>{t("adminsManagement.cols.updated")}</th>
                <th>{t("adminsManagement.cols.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <AdminsTableShimmerRows rowCount={5} />
              ) : visibleAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <span className="users-empty">{t("adminsManagement.empty")}</span>
                  </td>
                </tr>
              ) : (
                visibleAdmins.map((row) => (
                  <tr key={row.uid}>
                    <td>{row.email || "—"}</td>
                    <td>{row.displayName || "—"}</td>
                    <td>
                      <span className="users-role-pill">{adminRoleLabel(row.adminRole, t)}</span>
                    </td>
                    <td>{row.isActive ? t("adminsManagement.active") : t("adminsManagement.inactive")}</td>
                    <td>{formatAdminTimestamp(row.updatedAt, language)}</td>
                    <td>
                      <div className="users-row-actions">
                        {mayMutate ? (
                          <>
                            <button
                              type="button"
                              className="users-icon-button"
                              data-testid={`admins-edit-${row.uid}`}
                              title={t("adminsManagement.edit")}
                              onClick={() => openEdit(row)}
                            >
                              <Pencil size={16} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="users-icon-button"
                              data-testid={`admins-reset-${row.uid}`}
                              disabled={resetBusyUid === row.uid}
                              title={t("adminsManagement.sendReset")}
                              onClick={() => handleSendReset(row)}
                            >
                              <KeyRound size={16} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="users-icon-button users-icon-button--danger"
                              data-testid={`admins-delete-${row.uid}`}
                              disabled={row.uid === session?.uid}
                              title={t("adminsManagement.delete")}
                              onClick={() => setPendingDelete(row)}
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </>
                        ) : (
                          <span className="users-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {dialogMode && dialogAdmin ? (
          <AdminFormDialog
            form={dialogAdmin}
            isSaving={isSaving}
            mode={dialogMode}
            onCancel={() => {
              setDialogMode(null);
              setDialogAdmin(null);
            }}
            onSubmit={submitDialog}
            t={t}
          />
        ) : null}

        {pendingDelete ? (
          <div className="confirm-dialog-backdrop" role="presentation" data-testid="admins-delete-backdrop" onMouseDown={() => setPendingDelete(null)}>
            <div
              className="edit-user-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admins-delete-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="edit-user-dialog-header">
                <h2 id="admins-delete-title">{t("adminsManagement.deleteDialogTitle")}</h2>
                <button type="button" className="text-button" data-testid="admins-delete-cancel" onClick={() => setPendingDelete(null)}>
                  {t("adminsManagement.cancel")}
                </button>
              </div>
              <p className="admins-delete-body">{t("adminsManagement.deleteDialogDescription", { email: pendingDelete.email })}</p>
              <p className="admins-delete-footnote">{t("adminsManagement.deleteAuthFootnote")}</p>
              <div className="confirm-dialog-actions">
                <button type="button" className="confirm-dialog-button confirm-dialog-button--neutral" data-testid="admins-delete-dismiss" onClick={() => setPendingDelete(null)}>
                  {t("adminsManagement.cancel")}
                </button>
                <button type="button" className="confirm-dialog-button confirm-dialog-button--danger" data-testid="admins-delete-confirm" disabled={isDeleting} onClick={confirmDelete}>
                  {isDeleting ? t("adminsManagement.deleting") : t("adminsManagement.confirmDelete")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </ManagementIndexLayout>
    </DashboardLayout>
  );
}

function emptyAdminForm() {
  return {
    uid: "",
    email: "",
    password: "",
    displayName: "",
    adminRole: AdminRole.ADMIN,
    isActive: true,
  };
}

function validateAdminForm(mode, form, t) {
  if (mode === "create") {
    const email = String(form.email || "").trim();
    if (!email || !email.includes("@")) return t("adminsManagement.validation.emailInvalid");
    const pwd = String(form.password || "");
    if (pwd.length < 8) return t("adminsManagement.validation.passwordShort");
  }
  if (!String(form.displayName || "").trim()) return t("adminsManagement.validation.displayNameRequired");
  if (!Object.values(AdminRole).includes(form.adminRole)) return t("adminsManagement.validation.roleInvalid");
  return "";
}

function adminRoleLabel(role, t) {
  if (role === AdminRole.SUPER_ADMIN) return t("adminsManagement.roles.super_admin");
  if (role === AdminRole.ADMIN) return t("adminsManagement.roles.admin");
  if (role === AdminRole.SUPPORT) return t("adminsManagement.roles.support");
  return role || "—";
}

function formatAdminTimestamp(ts, language) {
  if (!ts?.toDate) return "—";
  try {
    return ts.toDate().toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function AdminFormDialog({ form: initialForm, isSaving, mode, onCancel, onSubmit, t }) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    setForm({ ...initialForm });
  }, [initialForm]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" data-testid="admins-form-backdrop" onMouseDown={onCancel}>
      <div
        className="edit-user-dialog plans-form-dialog admins-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admins-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="edit-user-dialog-header">
          <h2 id="admins-dialog-title">{mode === "create" ? t("adminsManagement.dialogCreateTitle") : t("adminsManagement.dialogEditTitle")}</h2>
          <button type="button" className="text-button" data-testid="admins-form-cancel" onClick={onCancel}>
            {t("adminsManagement.cancel")}
          </button>
        </div>

        <form
          className="plans-form-grid"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          {mode === "create" ? (
            <>
              <label className="plans-form-field plans-form-field--full">
                <span>
                  {t("adminsManagement.fields.email")}
                  <span className="plans-form-required-mark" aria-hidden>
                    {" "}
                    *
                  </span>
                </span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={form.email}
                  data-testid="admins-form-email"
                  onChange={(e) => update("email", e.target.value)}
                />
              </label>
              <label className="plans-form-field plans-form-field--full">
                <span>
                  {t("adminsManagement.fields.password")}
                  <span className="plans-form-required-mark" aria-hidden>
                    {" "}
                    *
                  </span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  data-testid="admins-form-password"
                  onChange={(e) => update("password", e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="plans-form-field plans-form-field--full">
              <span>{t("adminsManagement.fields.email")}</span>
              <input type="email" value={form.email} readOnly disabled data-testid="admins-form-email-readonly" />
            </label>
          )}

          <label className="plans-form-field plans-form-field--full">
            <span>
              {t("adminsManagement.fields.displayName")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <input value={form.displayName} data-testid="admins-form-displayName" onChange={(e) => update("displayName", e.target.value)} />
          </label>

          <label className="plans-form-field plans-form-field--full">
            <span>{t("adminsManagement.fields.role")}</span>
            <select value={form.adminRole} data-testid="admins-form-role" onChange={(e) => update("adminRole", e.target.value)}>
              <option value={AdminRole.SUPER_ADMIN}>{t("adminsManagement.roles.super_admin")}</option>
              <option value={AdminRole.ADMIN}>{t("adminsManagement.roles.admin")}</option>
              <option value={AdminRole.SUPPORT}>{t("adminsManagement.roles.support")}</option>
            </select>
          </label>

          {mode === "edit" ? (
            <label className="plans-form-field plans-form-field--full plans-form-field--checkbox">
              <input type="checkbox" checked={form.isActive} data-testid="admins-form-active" onChange={(e) => update("isActive", e.target.checked)} />
              <span>{t("adminsManagement.fields.isActive")}</span>
            </label>
          ) : null}

          <p className="plans-form-field plans-form-field--full admins-role-hint">{t("adminsManagement.roleHint")}</p>

          <div className="confirm-dialog-actions plans-form-actions">
            <button type="button" className="confirm-dialog-button confirm-dialog-button--neutral" data-testid="admins-form-dismiss" onClick={onCancel}>
              {t("adminsManagement.cancel")}
            </button>
            <button type="submit" className="confirm-dialog-button confirm-dialog-button--primary" data-testid="admins-form-submit" disabled={isSaving}>
              {isSaving ? t("adminsManagement.saving") : t("adminsManagement.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminsTableShimmerRows({ rowCount }) {
  return Array.from({ length: rowCount }, (_, index) => (
    <tr className="users-shimmer-row" key={`admins-shimmer-${index}`}>
      {[1, 2, 3, 4, 5, 6].map((c) => (
        <td key={c}>
          <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
        </td>
      ))}
    </tr>
  ));
}
