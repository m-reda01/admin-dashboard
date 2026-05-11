import React, { useCallback, useEffect, useState } from "react";
import { Building2, ExternalLink, Pencil, X } from "lucide-react";
import { ORG_TAB_PAGE_SIZE, getPaginationPages, OrgDocumentsTab, OrgPaymentsTab, OrgSubscriptionTab } from "./OrganizationDetailsPage.jsx";
import { DocumentDetailsModal } from "../documents/documentReadModels.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { isOrganizationUserAccount, userOrganizationLinkId } from "../users/userOrganizationContext.js";
import {
  ComplaintEditDialog,
  complaintStatusOptionLabel,
  formatComplaintDate,
} from "../complaints/complaintAdminShared.jsx";
import { profilePhotoHighResUrl } from "../utils/profilePhotoUrl.js";

export function UserDetailsPage({
  getUserProfileUseCase,
  listComplaintsByUserIdUseCase,
  updateComplaintStatusUseCase,
  listOrganizationSubscriptionsUseCase,
  updateUserUseCase,
  onNavigate,
  session,
  userId,
}) {
  const { language, t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [viewingDoc, setViewingDoc] = useState(null);

  const [individualSubscriptions, setIndividualSubscriptions] = useState([]);
  const [individualSubsLoading, setIndividualSubsLoading] = useState(false);
  const [individualSubsError, setIndividualSubsError] = useState("");

  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState("");

  const userForOrg = profile?.user;
  const showOrgWorkspace = Boolean(userForOrg && isOrganizationUserAccount(userForOrg));
  const orgNavId = userForOrg ? userOrganizationLinkId(userForOrg) : "";

  async function handleUpdateUser(updatedUser) {
    const displayName = String(updatedUser.displayName ?? "").trim();
    if (!displayName) {
      setEditError(t("usersManagement.editNameRequired"));
      return;
    }

    setIsSaving(true);
    setEditError("");

    try {
      const nextUser = await updateUserUseCase.execute({
        userId: profile.user.id,
        user: { ...updatedUser, displayName },
      });
      setProfile((current) => ({
        ...current,
        user: {
          ...current.user,
          ...nextUser,
        },
      }));
      setIsEditDialogOpen(false);
    } catch (updateError) {
      setEditError(updateError?.message || t("usersManagement.editError"));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setError("");

      try {
        const nextProfile = await getUserProfileUseCase.execute({ userId });
        if (isMounted) {
          setProfile(nextProfile);
        }
      } catch (profileError) {
        if (isMounted) {
          setError(profileError?.message || t("userDetails.loadError"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [getUserProfileUseCase, t, userId]);

  const reloadComplaintsSilent = useCallback(async () => {
    const uid = String(userId || "").trim();
    if (!uid || !listComplaintsByUserIdUseCase) return;
    try {
      const rows = await listComplaintsByUserIdUseCase.execute({ userId: uid });
      setComplaints(Array.isArray(rows) ? rows : []);
    } catch {
      /* keep existing rows */
    }
  }, [listComplaintsByUserIdUseCase, userId]);

  useEffect(() => {
    if (!listComplaintsByUserIdUseCase) {
      setComplaints([]);
      setComplaintsLoading(false);
      setComplaintsError("");
      return;
    }

    const uid = String(userId || "").trim();
    if (!uid) {
      setComplaints([]);
      setComplaintsLoading(false);
      setComplaintsError("");
      return;
    }

    let isMounted = true;

    async function loadComplaints() {
      setComplaintsLoading(true);
      setComplaintsError("");
      try {
        const rows = await listComplaintsByUserIdUseCase.execute({ userId: uid });
        if (isMounted) setComplaints(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (isMounted) {
          setComplaints([]);
          setComplaintsError(e?.message || t("userDetails.complaintsLoadError"));
        }
      } finally {
        if (isMounted) setComplaintsLoading(false);
      }
    }

    loadComplaints();

    return () => {
      isMounted = false;
    };
  }, [listComplaintsByUserIdUseCase, t, userId]);

  useEffect(() => {
    if (!profile?.user || !listOrganizationSubscriptionsUseCase) {
      setIndividualSubscriptions([]);
      setIndividualSubsLoading(false);
      setIndividualSubsError("");
      return;
    }

    const uid = String(userId || profile.user.uid || profile.user.id || "").trim();
    if (!uid) {
      setIndividualSubscriptions([]);
      setIndividualSubsLoading(false);
      setIndividualSubsError("");
      return;
    }

    let isMounted = true;

    async function loadIndividualSubscriptions() {
      setIndividualSubsLoading(true);
      setIndividualSubsError("");
      try {
        const rows = await listOrganizationSubscriptionsUseCase.execute({ ownerUid: uid });
        if (!isMounted) return;
        const list = Array.isArray(rows) ? rows : [];
        const sorted = [...list].sort((a, b) => {
          const tb = b.createdAt?.getTime?.() || b.startDate?.getTime?.() || 0;
          const ta = a.createdAt?.getTime?.() || a.startDate?.getTime?.() || 0;
          return tb - ta;
        });
        setIndividualSubscriptions(sorted);
      } catch (e) {
        if (isMounted) {
          setIndividualSubscriptions([]);
          setIndividualSubsError(e?.message || t("organizationDetails.subscriptionsLoadError"));
        }
      } finally {
        if (isMounted) setIndividualSubsLoading(false);
      }
    }

    loadIndividualSubscriptions();

    return () => {
      isMounted = false;
    };
  }, [listOrganizationSubscriptionsUseCase, profile?.user, t, userId]);

  return (
    <DashboardLayout activePage="users" onNavigate={onNavigate} session={session} title={t("userDetails.title")}>
      <div className="user-details-page">
        <nav className="user-details-breadcrumb" aria-label={t("userDetails.breadcrumbLabel")}>
          <button type="button" data-testid="user-details-breadcrumb-users" onClick={() => onNavigate("/users")}>
            {t("dashboard.nav.users")}
          </button>
          <span>/</span>
          <span>{t("userDetails.profile")}</span>
        </nav>

        {isLoading && <UserDetailsShimmer />}

        {!isLoading && error && (
          <section className="user-details-empty">
            <h2>{t("userDetails.loadError")}</h2>
            <button type="button" data-testid="user-details-back-users" onClick={() => onNavigate("/users")}>
              {t("userDetails.backToUsers")}
            </button>
          </section>
        )}

        {!isLoading && !error && profile && (
          <>
            <UserProfileHeader
              profile={profile}
              showOrganizationShortcut={showOrgWorkspace && Boolean(orgNavId)}
              t={t}
              language={language}
              onAvatarClick={() => setIsImageDialogOpen(true)}
              onEdit={() => {
                setEditError("");
                setIsEditDialogOpen(true);
              }}
              onOpenOrganization={() => orgNavId && onNavigate(`/organizations/${orgNavId}`)}
            />
            <UserDetailsTabs
              complaints={complaints}
              complaintsError={complaintsError}
              complaintsLoading={complaintsLoading}
              documents={profile.documents}
              getUserProfileUseCase={getUserProfileUseCase}
              language={language}
              onNavigate={onNavigate}
              payments={profile.payments}
              setViewingDoc={setViewingDoc}
              subscriptions={individualSubscriptions}
              subscriptionsError={individualSubsError}
              subscriptionsLoading={individualSubsLoading}
              onComplaintsReloadSilent={reloadComplaintsSilent}
              t={t}
              updateComplaintStatusUseCase={updateComplaintStatusUseCase}
              user={profile.user}
            />
            <UserImageDialog
              open={isImageDialogOpen}
              onClose={() => setIsImageDialogOpen(false)}
              user={profile.user}
              t={t}
            />
            <EditUserDetailsDialog
              open={isEditDialogOpen}
              user={profile.user}
              onCancel={() => setIsEditDialogOpen(false)}
              onSubmit={handleUpdateUser}
              isSaving={isSaving}
              error={editError}
              t={t}
            />
            <DocumentDetailsModal doc={viewingDoc} language={language} onClose={() => setViewingDoc(null)} t={t} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function UserDetailsTabs({
  complaints,
  complaintsError,
  complaintsLoading,
  documents,
  getUserProfileUseCase,
  language,
  onComplaintsReloadSilent,
  onNavigate,
  payments,
  setViewingDoc,
  subscriptions,
  subscriptionsError,
  subscriptionsLoading,
  t,
  updateComplaintStatusUseCase,
  user,
}) {
  const [activeTab, setActiveTab] = useState("documents");
  const [individualDocsPage, setIndividualDocsPage] = useState(1);

  useEffect(() => {
    setIndividualDocsPage(1);
  }, [documents]);

  const docTotalPages = Math.max(1, Math.ceil(documents.length / ORG_TAB_PAGE_SIZE));
  const docSafePage = Math.min(individualDocsPage, docTotalPages);
  const docPageRows = documents.slice((docSafePage - 1) * ORG_TAB_PAGE_SIZE, docSafePage * ORG_TAB_PAGE_SIZE);
  const docPaginationPages = getPaginationPages(docSafePage, docTotalPages);

  return (
    <section className="user-details-panel user-details-panel--tabs organization-details-tabs-panel organization-details-page">
      <div className="user-details-tabs" role="tablist" aria-label={t("userDetails.profile")}>
        <button
          aria-selected={activeTab === "documents"}
          className={activeTab === "documents" ? "is-active" : ""}
          data-testid="user-details-tab-documents"
          onClick={() => setActiveTab("documents")}
          role="tab"
          type="button"
        >
          {t("userDetails.documents")}
        </button>
        <button
          aria-selected={activeTab === "subscription"}
          className={activeTab === "subscription" ? "is-active" : ""}
          data-testid="user-details-tab-subscription"
          onClick={() => setActiveTab("subscription")}
          role="tab"
          type="button"
        >
          {t("userDetails.status")}
        </button>
        <button
          aria-selected={activeTab === "transactions"}
          className={activeTab === "transactions" ? "is-active" : ""}
          data-testid="user-details-tab-transactions"
          onClick={() => setActiveTab("transactions")}
          role="tab"
          type="button"
        >
          {t("userDetails.transactionHistory")}
        </button>
        <button
          aria-selected={activeTab === "complaints"}
          className={activeTab === "complaints" ? "is-active" : ""}
          data-testid="user-details-tab-complaints"
          onClick={() => setActiveTab("complaints")}
          role="tab"
          type="button"
        >
          {t("userDetails.complaints")}
        </button>
      </div>

      {activeTab === "documents" ? (
        <OrgDocumentsTab
          docPageRows={docPageRows}
          docPaginationPages={docPaginationPages}
          docSafePage={docSafePage}
          docTotalPages={docTotalPages}
          documents={documents}
          isLoading={false}
          language={language}
          onNavigate={onNavigate}
          setDocumentsPage={setIndividualDocsPage}
          setViewingDoc={setViewingDoc}
          t={t}
        />
      ) : null}
      {activeTab === "subscription" ? (
        <>
          {subscriptionsError ? (
            <p className="organization-details-lists-error" data-testid="user-details-subscriptions-error">
              {subscriptionsError}
            </p>
          ) : null}
          <OrgSubscriptionTab language={language} listsLoading={subscriptionsLoading} subscriptions={subscriptions} t={t} />
        </>
      ) : null}
      {activeTab === "transactions" ? (
        <OrgPaymentsTab
          getUserProfileUseCase={getUserProfileUseCase}
          isLoading={false}
          language={language}
          payments={payments}
          t={t}
          onNavigate={onNavigate}
        />
      ) : null}
      {activeTab === "complaints" ? (
        <UserComplaintsTab
          complaints={complaints}
          complaintsError={complaintsError}
          complaintsLoading={complaintsLoading}
          language={language}
          onComplaintsReloadSilent={onComplaintsReloadSilent}
          t={t}
          updateComplaintStatusUseCase={updateComplaintStatusUseCase}
        />
      ) : null}
    </section>
  );
}

function UserComplaintsTab({
  complaints,
  complaintsError,
  complaintsLoading,
  language,
  onComplaintsReloadSilent,
  t,
  updateComplaintStatusUseCase,
}) {
  const [editingComplaint, setEditingComplaint] = useState(null);
  const canEditStatus = Boolean(updateComplaintStatusUseCase);
  const tableColSpan = 5;

  function statusBadgeClass(status) {
    const key = String(status || "").trim().toLowerCase();
    if (key === "open" || key === "pending") return "plans-badge plans-badge--warning";
    if (key === "resolved" || key === "closed") return "plans-badge plans-badge--recommended";
    if (key === "rejected") return "plans-badge plans-badge--danger";
    return "plans-badge plans-badge--info";
  }

  return (
    <div className="organization-details-tab-shell plans-management-page documents-management-page" data-testid="user-details-complaints-tab">
      {complaintsError ? (
        <p className="organization-details-lists-error" data-testid="user-details-complaints-error">
          {complaintsError}
        </p>
      ) : null}
      <div className="users-table-shell plans-table-shell">
        <div className="users-table-scroll plans-table-scroll">
          <table
            className="plans-table documents-table documents-table--embedded documents-table--complaints"
            data-testid="user-details-complaints-table"
          >
            <thead>
              <tr>
                <th>{t("userDetails.complaintType")}</th>
                <th>{t("userDetails.complaintDescription")}</th>
                <th>{t("userDetails.complaintStatus")}</th>
                <th>{t("userDetails.complaintDatesColumn")}</th>
                <th>{t("userDetails.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {complaintsLoading ? (
                <tr>
                  <td className="plans-empty-cell" colSpan={tableColSpan}>
                    …
                  </td>
                </tr>
              ) : null}
              {!complaintsLoading && complaints.length === 0 ? (
                <tr>
                  <td className="plans-empty-cell" colSpan={tableColSpan}>
                    {t("userDetails.noComplaints")}
                  </td>
                </tr>
              ) : null}
              {!complaintsLoading &&
                complaints.map((row) => (
                  <tr key={row.id} data-testid={`user-details-complaint-row-${row.id}`}>
                    <td>{row.typeLabel || row.typeKey || "—"}</td>
                    <td className="documents-name-cell">
                      <span className="plans-management-desc-preview complaint-description-preview">{row.description || "—"}</span>
                    </td>
                    <td>
                      <span className={statusBadgeClass(row.status)} data-testid={`user-details-complaint-status-${row.id}`}>
                        {complaintStatusOptionLabel(row.status, t)}
                      </span>
                    </td>
                    <td className="complaint-dates-cell">
                      <div className="complaint-date-stack">
                        <div>
                          <small>{t("userDetails.complaintCreatedShort")}</small>
                          {formatComplaintDate(row.createdAt, language)}
                        </div>
                        <div>
                          <small>{t("userDetails.complaintUpdatedShort")}</small>
                          {formatComplaintDate(row.updatedAt, language)}
                        </div>
                      </div>
                    </td>
                    <td className="complaints-actions-cell documents-row-icon-actions">
                      {row.attachmentUrl || canEditStatus ? (
                        <>
                          {row.attachmentUrl ? (
                            <a
                              className="documents-icon-action documents-icon-action--file"
                              data-testid={`user-details-complaint-attachment-${row.id}`}
                              href={row.attachmentUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                              aria-label={t("userDetails.complaintAttachment")}
                              title={t("userDetails.complaintAttachment")}
                            >
                              <ExternalLink size={18} />
                            </a>
                          ) : null}
                          {canEditStatus ? (
                            <button
                              type="button"
                              className="documents-icon-action documents-icon-action--details"
                              data-testid={`user-details-complaint-edit-${row.id}`}
                              aria-label={t("userDetails.complaintEditTitle")}
                              title={t("userDetails.complaintEditTitle")}
                              onClick={() => setEditingComplaint(row)}
                            >
                              <Pencil size={20} strokeWidth={1.75} aria-hidden />
                            </button>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingComplaint ? (
        <ComplaintEditDialog
          complaint={editingComplaint}
          language={language}
          onClose={() => setEditingComplaint(null)}
          onSaved={async () => {
            await onComplaintsReloadSilent();
            setEditingComplaint(null);
          }}
          t={t}
          updateComplaintStatusUseCase={updateComplaintStatusUseCase}
        />
      ) : null}
    </div>
  );
}

function UserProfileHeader({ language, profile, showOrganizationShortcut, t, onAvatarClick, onEdit, onOpenOrganization }) {
  const user = profile.user;
  const displayName = getDisplayName(user);

  return (
    <section className="user-profile-card">
      <div className="user-profile-identity">
        <Avatar user={user} displayName={displayName} onClick={onAvatarClick} />
        <strong>{displayName}</strong>
      </div>

      <dl className="user-profile-facts">
        <div>
          <dt>{t("userDetails.emailAddress")}</dt>
          <dd>{user.email || "-"}</dd>
        </div>
        <div>
          <dt>{t("usersManagement.role")}</dt>
          <dd data-testid="user-details-profile-role">{formatRole(user.role, t)}</dd>
        </div>
        <div>
          <dt>{t("userDetails.dateJoined")}</dt>
          <dd>{formatDate(user.createdAt, language)}</dd>
        </div>
      </dl>

      <div className="user-profile-actions">
        {showOrganizationShortcut ? (
          <button
            type="button"
            className="user-profile-action-icon"
            data-testid="user-details-open-organization"
            aria-label={t("usersManagement.openOrganizationFromRole")}
            onClick={onOpenOrganization}
          >
            <Building2 size={18} />
          </button>
        ) : null}
        <button
          type="button"
          className="user-profile-action-icon"
          data-testid="user-details-edit-open"
          aria-label={t("usersManagement.editDialogTitle")}
          onClick={onEdit}
        >
          <Pencil size={18} />
        </button>
      </div>
    </section>
  );
}

function UserImageDialog({ open, onClose, user, t }) {
  if (!open) return null;

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="user-image-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("userDetails.profilePhotoLightbox")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="user-image-dialog-toolbar">
          <button
            type="button"
            className="user-image-dialog-close"
            data-testid="user-details-image-close"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <X aria-hidden size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="user-image-dialog-body">
          {user.photoUrl ? (
            <img
              className="user-image-preview"
              alt=""
              decoding="async"
              fetchPriority="high"
              src={profilePhotoHighResUrl(user.photoUrl)}
            />
          ) : (
            <div className="user-image-preview user-image-preview--placeholder">{getInitials(getDisplayName(user))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditUserDetailsDialog({ open, user, onCancel, onSubmit, isSaving, error, t }) {
  const [displayName, setDisplayName] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName?.trim() || "");
      setIsActive(user.isActive !== false);
    }
  }, [open, user]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...user,
      displayName: displayName.trim(),
      isActive,
    });
  }

  if (!open || !user) return null;

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="user-details-edit-dialog-title"
        aria-modal="true"
        className="edit-user-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="edit-user-dialog-header">
          <div>
            <h2 id="user-details-edit-dialog-title">{t("usersManagement.editDialogTitle")}</h2>
            <p>{user.email || "-"}</p>
          </div>
        </div>

        <form className="edit-user-form" onSubmit={handleSubmit}>
          <label>
            <span>{t("usersManagement.editDisplayName")}</span>
            <input
              data-testid="user-details-edit-display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
            />
          </label>

          <label>
            <span>{t("usersManagement.email")}</span>
            <input data-testid="user-details-edit-email-readonly" disabled readOnly type="email" value={user.email || "-"} />
          </label>

          <label>
            <span>{t("usersManagement.status")}</span>
            <select
              data-testid="user-details-edit-status"
              value={isActive ? "active" : "inactive"}
              onChange={(event) => setIsActive(event.target.value === "active")}
            >
              <option value="active">{t("usersManagement.active")}</option>
              <option value="inactive">{t("usersManagement.inactive")}</option>
            </select>
          </label>

          {error ? <p className="app-alert app-alert--error">{error}</p> : null}

          <div className="confirm-dialog-actions">
            <button
              type="button"
              className="confirm-dialog-button confirm-dialog-button--neutral"
              data-testid="user-details-edit-cancel"
              onClick={onCancel}
            >
              {t("usersManagement.cancel")}
            </button>
            <button
              type="submit"
              className="confirm-dialog-button confirm-dialog-button--primary"
              data-testid="user-details-edit-submit"
              disabled={isSaving}
            >
              {isSaving ? t("usersManagement.saving") : t("usersManagement.saveChanges")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function UserDetailsShimmer() {
  return (
    <div className="user-details-shimmer">
      <span />
      <span />
      <span />
    </div>
  );
}

function Avatar({ displayName, user, onClick }) {
  const className = `user-profile-avatar${onClick ? " user-profile-avatar--clickable" : ""}`;

  if (user.photoUrl) {
    return <img className={className} src={user.photoUrl} alt="" onClick={onClick} />;
  }

  return (
    <span className={className} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {getInitials(displayName)}
    </span>
  );
}

function getDisplayName(user) {
  return user.displayName?.trim() || user.email || "User";
}

function getInitials(value) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0][0], words[1][0]] : [value[0], value[1]];
  return letters.filter(Boolean).join("").toUpperCase();
}

function formatRole(role, t) {
  if (!role) return "-";
  const normalizedRole = role.trim().toLowerCase().replace(/\s+/g, "_");
  const translatedRole = t(`usersManagement.roles.${normalizedRole}`);

  if (translatedRole !== `usersManagement.roles.${normalizedRole}`) {
    return translatedRole;
  }

  return role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date, language) {
  if (!date) return "-";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

