import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Download,
  Eye,
  ExternalLink,
  FileX,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import * as XLSX from "xlsx";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import {
  downloadPaymentPdf,
  formatBillingCurrency,
  formatBillingPaymentDate,
  isOrganizationPayment,
  PaymentDetailsDialog,
} from "../payments/billingPaymentUi.jsx";
import {
  DocumentAvatarThumb,
  DocumentDetailsModal,
  getDocumentListStatusKey,
  getDocumentUploaderUserId,
} from "../documents/documentReadModels.jsx";

export const ORG_TAB_PAGE_SIZE = 10;

export function getPaginationPages(currentPage, totalPages) {
  const delta = 2;
  const pages = new Set([1, totalPages]);
  for (let i = currentPage - delta; i <= currentPage + delta; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export function hasBlockchainSection(org) {
  if (!org) return false;
  const fields = [
    org.contractAddress,
    org.contractStatus,
    org.ownerWalletAddress,
    org.ownerContractAddress,
    org.ownerContractState,
  ];
  return fields.some((v) => String(v ?? "").trim().length > 0);
}

function formatDateValue(date, language) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatDateStr(str, language) {
  if (!str) return "—";
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(str));
  } catch {
    return str;
  }
}

function getDisplayNameForMember(m) {
  return m.displayName?.trim() || m.email?.trim() || "—";
}

function Avatar({ displayName, photoUrl }) {
  if (photoUrl) {
    return <img className="users-avatar users-avatar-image" src={photoUrl} alt="" />;
  }
  return <span className="users-avatar">{getInitials(displayName)}</span>;
}

function getInitials(value) {
  const v = String(value || "U").trim();
  const words = v.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0][0], words[1][0]] : [v[0], v[1]];
  return letters.filter(Boolean).join("").toUpperCase() || "U";
}

function OrgProfileAvatar({ logoUrl, name }) {
  const url = String(logoUrl || "").trim();
  if (/^https?:\/\//i.test(url)) {
    return <img className="user-profile-avatar" src={url} alt="" />;
  }
  return <span className="user-profile-avatar">{getInitials(name || "O")}</span>;
}

function OrganizationProfileHeader({ language, organization, latestSubscription, t, onPreviewLogo, onEdit }) {
  return (
    <section className="user-profile-card organization-details-profile-card">
      {onEdit ? (
        <button
          type="button"
          className="organization-details-edit-trigger"
          data-testid="organization-details-edit-open"
          onClick={onEdit}
          aria-label={t("organizationDetails.editOrganization")}
        >
          <Pencil size={18} />
        </button>
      ) : null}
      <div className="user-profile-identity">
        <button
          type="button"
          className="user-profile-avatar-button"
          onClick={onPreviewLogo}
          aria-label={t("organizationDetails.previewLogo")}
        >
          <OrgProfileAvatar logoUrl={organization.logoUrl} name={organization.name} />
        </button>
        <strong>{organization.name}</strong>
      </div>

      <dl className="user-profile-facts">
        <div>
          <dt>{t("organizationDetails.fields.description")}</dt>
          <dd>{organization.description?.trim() ? organization.description : "—"}</dd>
        </div>
        <div>
          <dt>{t("organizationDetails.fields.membersCount")}</dt>
          <dd>{organization.membersCount ?? 0}</dd>
        </div>
        <div>
          <dt>{t("organizationDetails.fields.status")}</dt>
          <dd>{organization.isActive ? t("organizationsManagement.activated") : t("organizationsManagement.deactivated")}</dd>
        </div>
        <div>
          <dt>{t("organizationDetails.fields.createdAt")}</dt>
          <dd>{formatDateValue(organization.createdAt, language)}</dd>
        </div>
      </dl>

      <div className="organization-details-profile-aside">
        {latestSubscription ? (
          <div className="organization-details-profile-subscription">
            <div className="organization-details-profile-subscription-card">
              <p>{t("userDetails.planExpiry")}</p>
              <strong>{formatSubscriptionFieldValue("endDate", latestSubscription, language)}</strong>
            </div>
            <div className="organization-details-profile-subscription-card">
              <p>{t("organizationsManagement.subscriptionPlan")}</p>
              <strong>{latestSubscription.packageName || t("organizationDetails.subscriptionCardTitle")}</strong>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EditOrganizationDialog({ open, organization, onCancel, onSubmit, isSaving, error, t }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && organization) {
      setName(organization.name || "");
      setDescription(organization.description || "");
      setLogoUrl(String(organization.logoUrl || "").trim());
      setIsActive(organization.isActive !== false);
    }
  }, [open, organization]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      logoUrl: logoUrl.trim(),
      isActive,
    });
  }

  if (!open || !organization) return null;

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="edit-user-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-org-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="edit-user-dialog-header">
          <h2 id="edit-org-dialog-title">{t("organizationDetails.editDialogTitle")}</h2>
        </div>

        <div className="edit-user-form">
          <label>
            <span>{t("organizationDetails.editNameLabel")}</span>
            <input
              type="text"
              data-testid="organization-details-edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            <span>{t("organizationDetails.editDescriptionLabel")}</span>
            <textarea
              data-testid="organization-details-edit-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            <span>{t("organizationDetails.editLogoUrlLabel")}</span>
            <input
              type="text"
              inputMode="url"
              data-testid="organization-details-edit-logo-url"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://"
            />
          </label>
          <label className="edit-org-active-label">
            <input
              type="checkbox"
              data-testid="organization-details-edit-active"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>{t("organizationDetails.editActiveLabel")}</span>
          </label>
          {error ? <p className="app-alert app-alert--error">{error}</p> : null}
        </div>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-button confirm-dialog-button--neutral"
            data-testid="organization-details-edit-cancel"
            onClick={onCancel}
          >
            {t("organizationDetails.cancel")}
          </button>
          <button
            type="submit"
            className="confirm-dialog-button confirm-dialog-button--primary"
            data-testid="organization-details-edit-submit"
            disabled={isSaving}
          >
            {isSaving ? t("usersManagement.saving") : t("usersManagement.saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatRole(role, t) {
  if (!role) return "—";
  const normalizedRole = role.trim().toLowerCase().replace(/\s+/g, "_");
  const translatedRole = t(`usersManagement.roles.${normalizedRole}`);
  if (translatedRole !== `usersManagement.roles.${normalizedRole}`) return translatedRole;
  return role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OrganizationDetailsPage({
  getOrganizationUseCase,
  getUserProfileUseCase,
  listOrganizationMembersUseCase,
  listOrganizationDocumentsUseCase,
  listOrganizationSubscriptionsUseCase,
  listPaymentsUseCase,
  updateOrganizationUseCase,
  onNavigate,
  organizationId,
  session,
}) {
  const { language, t } = useI18n();
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(false);
  const [error, setError] = useState("");
  const [listsError, setListsError] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [membersPage, setMembersPage] = useState(1);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleSaveOrganization(patch) {
    if (!updateOrganizationUseCase) return;
    const nextName = String(patch.name ?? "").trim();
    if (!nextName) {
      setEditError(t("organizationDetails.editNameRequired"));
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const next = await updateOrganizationUseCase.execute({
        orgId: organizationId,
        organization: { ...organization, ...patch, name: nextName },
      });
      setOrganization(next);
      setEditDialogOpen(false);
    } catch (e) {
      setEditError(e?.message || t("organizationDetails.editError"));
    } finally {
      setEditSaving(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError("");
      setListsError("");
      setOrganization(null);
      setMembers([]);
      setDocuments([]);
      setSubscriptions([]);
      setPayments([]);

      try {
        const row = await getOrganizationUseCase.execute({ orgId: organizationId });
        if (!isMounted) return;
        setOrganization(row);
        const ownerUid = String(row.ownerUid ?? "").trim();
        setListsLoading(true);
        try {
          const [nextMembers, nextDocs, nextSubs, nextPayments] = await Promise.all([
            listOrganizationMembersUseCase.execute({ orgId: organizationId }),
            listOrganizationDocumentsUseCase.execute({ organizationId: organizationId, pageSize: 100 }),
            listOrganizationSubscriptionsUseCase.execute({ ownerUid }),
            listPaymentsUseCase
              ? listPaymentsUseCase.execute({
                  pageSize: 100,
                  filterOrganizationId: organizationId,
                  filterOrganizationOwnerUid: ownerUid,
                })
              : Promise.resolve([]),
          ]);
          if (isMounted) {
            setMembers(nextMembers);
            setDocuments(nextDocs);
            setSubscriptions(nextSubs);
            setPayments(Array.isArray(nextPayments) ? nextPayments : []);
          }
        } catch (listErr) {
          if (isMounted) {
            setListsError(listErr?.message || t("organizationDetails.membersLoadError"));
          }
        } finally {
          if (isMounted) setListsLoading(false);
        }
      } catch (e) {
        if (isMounted) setError(e?.message || t("organizationDetails.loadError"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [
    getOrganizationUseCase,
    listOrganizationDocumentsUseCase,
    listOrganizationMembersUseCase,
    listOrganizationSubscriptionsUseCase,
    listPaymentsUseCase,
    organizationId,
    t,
  ]);

  useEffect(() => {
    setMembersPage(1);
    setDocumentsPage(1);
  }, [organizationId]);

  const showBlockchainTab = useMemo(() => hasBlockchainSection(organization), [organization]);
  const latestSubscription = subscriptions[0];

  const tabIds = useMemo(() => {
    const base = ["members", "files"];
    if (showBlockchainTab) base.push("blockchain");
    base.push("subscription", "payments");
    return base;
  }, [showBlockchainTab]);

  useEffect(() => {
    if (!tabIds.includes(activeTab)) {
      setActiveTab("members");
    }
  }, [activeTab, tabIds]);

  const visibleMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const ta = (a.joinedAt?.getTime?.() || a.invitedAt?.getTime?.() || 0);
      const tb = (b.joinedAt?.getTime?.() || b.invitedAt?.getTime?.() || 0);
      return tb - ta;
    });
  }, [members]);

  const memberTotalPages = Math.max(1, Math.ceil(visibleMembers.length / ORG_TAB_PAGE_SIZE));
  const memberSafePage = Math.min(membersPage, memberTotalPages);
  const memberPageRows = visibleMembers.slice(
    (memberSafePage - 1) * ORG_TAB_PAGE_SIZE,
    memberSafePage * ORG_TAB_PAGE_SIZE,
  );
  const memberPaginationPages = getPaginationPages(memberSafePage, memberTotalPages);

  const docTotalPages = Math.max(1, Math.ceil(documents.length / ORG_TAB_PAGE_SIZE));
  const docSafePage = Math.min(documentsPage, docTotalPages);
  const docPageRows = documents.slice((docSafePage - 1) * ORG_TAB_PAGE_SIZE, docSafePage * ORG_TAB_PAGE_SIZE);
  const docPaginationPages = getPaginationPages(docSafePage, docTotalPages);

  return (
    <DashboardLayout activePage="organizations" onNavigate={onNavigate} session={session} title={t("organizationDetails.title")}>
      <div className="user-details-page organization-details-page">
        <nav className="user-details-breadcrumb" aria-label={t("organizationDetails.breadcrumbLabel")}>
          <button type="button" data-testid="organization-details-breadcrumb-list" onClick={() => onNavigate("/organizations")}>
            {t("dashboard.nav.organizations")}
          </button>
          <span>/</span>
          <span>{organization?.name || t("organizationDetails.profile")}</span>
        </nav>

        {isLoading && <div className="user-details-shimmer" aria-hidden><span /><span /><span /></div>}

        {!isLoading && error && (
          <section className="user-details-empty">
            <h2>{error}</h2>
            <button type="button" data-testid="organization-details-back" onClick={() => onNavigate("/organizations")}>
              {t("organizationDetails.backToList")}
            </button>
          </section>
        )}

        {!isLoading && !error && organization && (
          <>
            <OrganizationProfileHeader
              language={language}
              organization={organization}
              latestSubscription={latestSubscription}
              t={t}
              onPreviewLogo={() => setLogoPreviewOpen(true)}
              onEdit={
                updateOrganizationUseCase
                  ? () => {
                      setEditError("");
                      setEditDialogOpen(true);
                    }
                  : undefined
              }
            />

            <EditOrganizationDialog
              open={editDialogOpen}
              organization={organization}
              error={editError}
              isSaving={editSaving}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditError("");
              }}
              onSubmit={handleSaveOrganization}
              t={t}
            />

            <section className="user-details-panel user-details-panel--tabs organization-details-tabs-panel">
              <div className="user-details-tabs" role="tablist" aria-label={t("organizationDetails.tabListLabel")}>
                <button
                  type="button"
                  role="tab"
                  data-testid="organization-tab-members"
                  aria-selected={activeTab === "members"}
                  className={activeTab === "members" ? "is-active" : ""}
                  onClick={() => setActiveTab("members")}
                >
                  {t("organizationDetails.tabs.members")}
                </button>
                <button
                  type="button"
                  role="tab"
                  data-testid="organization-tab-files"
                  aria-selected={activeTab === "files"}
                  className={activeTab === "files" ? "is-active" : ""}
                  onClick={() => setActiveTab("files")}
                >
                  {t("organizationDetails.tabs.files")}
                </button>
                {showBlockchainTab && (
                  <button
                    type="button"
                    role="tab"
                    data-testid="organization-tab-blockchain"
                    aria-selected={activeTab === "blockchain"}
                    className={activeTab === "blockchain" ? "is-active" : ""}
                    onClick={() => setActiveTab("blockchain")}
                  >
                    {t("organizationDetails.tabs.blockchain")}
                  </button>
                )}
                <button
                  type="button"
                  role="tab"
                  data-testid="organization-tab-subscription"
                  aria-selected={activeTab === "subscription"}
                  className={activeTab === "subscription" ? "is-active" : ""}
                  onClick={() => setActiveTab("subscription")}
                >
                  {t("organizationDetails.tabs.subscription")}
                </button>
                <button
                  type="button"
                  role="tab"
                  data-testid="organization-tab-payments"
                  aria-selected={activeTab === "payments"}
                  className={activeTab === "payments" ? "is-active" : ""}
                  onClick={() => setActiveTab("payments")}
                >
                  {t("organizationDetails.tabs.paymentTransactions")}
                </button>
              </div>

              {listsError && (
                <p className="organization-details-lists-error" data-testid="organization-lists-error">
                  {listsError}
                </p>
              )}

              {activeTab === "members" && (
                <OrgMembersTab
                  isLoading={listsLoading}
                  language={language}
                  memberPageRows={memberPageRows}
                  memberPaginationPages={memberPaginationPages}
                  memberSafePage={memberSafePage}
                  memberTotalPages={memberTotalPages}
                  onNavigate={onNavigate}
                  setMembersPage={setMembersPage}
                  t={t}
                  visibleMembers={visibleMembers}
                />
              )}

              {activeTab === "files" && (
                <OrgDocumentsTab
                  docPageRows={docPageRows}
                  docPaginationPages={docPaginationPages}
                  docSafePage={docSafePage}
                  docTotalPages={docTotalPages}
                  documents={documents}
                  isLoading={listsLoading}
                  language={language}
                  onNavigate={onNavigate}
                  setDocumentsPage={setDocumentsPage}
                  setViewingDoc={setViewingDoc}
                  t={t}
                />
              )}

              {activeTab === "blockchain" && showBlockchainTab && (
                <OrgBlockchainTab organization={organization} t={t} />
              )}

              {activeTab === "subscription" && (
                <OrgSubscriptionTab language={language} listsLoading={listsLoading} subscriptions={subscriptions} t={t} />
              )}

              {activeTab === "payments" && (
                <OrgPaymentsTab
                  getUserProfileUseCase={getUserProfileUseCase}
                  isLoading={listsLoading}
                  language={language}
                  payments={payments}
                  t={t}
                  onNavigate={onNavigate}
                />
              )}
            </section>
          </>
        )}

        <OrgLogoPreviewDialog
          open={logoPreviewOpen}
          logoUrl={organization?.logoUrl}
          name={organization?.name || t("organizationDetails.profile")}
          onClose={() => setLogoPreviewOpen(false)}
          t={t}
        />
        <DocumentDetailsModal doc={viewingDoc} language={language} onClose={() => setViewingDoc(null)} t={t} />
      </div>
    </DashboardLayout>
  );
}

export function OrgMembersTab({
  isLoading,
  language,
  memberPageRows,
  memberPaginationPages,
  memberSafePage,
  memberTotalPages,
  onNavigate,
  setMembersPage,
  t,
  visibleMembers,
}) {
  function goToPage(p) {
    setMembersPage(Math.min(Math.max(p, 1), memberTotalPages));
  }

  return (
    <div className="organization-details-tab-shell">
      <div className="users-table-shell">
        <div className="users-table-scroll">
          <table className="users-table" data-testid="organization-members-table">
            <thead>
              <tr>
                <th>{t("usersManagement.name")}</th>
                <th>{t("organizationDetails.memberRole")}</th>
                <th>{t("organizationDetails.memberStatus")}</th>
                <th>{t("organizationDetails.memberJoined")}</th>
                <th>{t("userDetails.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="users-empty-cell">
                    …
                  </td>
                </tr>
              )}
              {!isLoading && visibleMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="users-empty-cell">
                    {t("organizationDetails.noMembers")}
                  </td>
                </tr>
              )}
              {!isLoading &&
                memberPageRows.map((m) => {
                  const displayName = getDisplayNameForMember(m);
                  const active = String(m.status || "").toLowerCase() === "active" && !m.isDeleted;
                  return (
                    <tr key={m.uid}>
                      <td>
                        <div className="users-name-cell">
                          <Avatar displayName={displayName} photoUrl={m.photoUrl} />
                          <span>
                            <strong>{displayName}</strong>
                            <small>{m.email || "—"}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="users-role">{formatRole(m.role, t)}</span>
                      </td>
                      <td>
                        <span className={`users-pill users-pill--${active ? "activated" : "deactivated"}`}>
                          {m.isDeleted ? t("organizationsManagement.deactivated") : active ? t("usersManagement.active") : m.status || "—"}
                        </span>
                      </td>
                      <td>{formatDateValue(m.joinedAt || m.invitedAt, language)}</td>
                      <td>
                        <div className="users-actions-cell">
                          <button
                            type="button"
                            data-testid={`organization-member-view-${m.uid}`}
                            aria-label={t("organizationDetails.viewUser")}
                            onClick={() => onNavigate(`/users/${encodeURIComponent(m.uid)}`)}
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && visibleMembers.length > 0 && (
        <div className="users-pagination billing-users-pagination documents-pagination-footer organization-details-tab-pagination">
          <span className="users-pagination-meta" data-testid="organization-members-pagination-meta">
            {memberSafePage} / {memberTotalPages} · {visibleMembers.length}
          </span>
          <div className="billing-pagination-buttons">
            <button type="button" disabled={memberSafePage === 1} data-testid="organization-members-page-first" onClick={() => goToPage(1)}>
              <ChevronsLeft size={16} />
            </button>
            <button type="button" disabled={memberSafePage === 1} data-testid="organization-members-page-prev" onClick={() => goToPage(memberSafePage - 1)}>
              <ChevronDown className="rotate-90" size={16} />
            </button>
            {memberPaginationPages.map((page) => (
              <button
                className={page === memberSafePage ? "is-active" : ""}
                type="button"
                key={page}
                data-testid={`organization-members-page-${page}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
            <button type="button" disabled={memberSafePage === memberTotalPages} data-testid="organization-members-page-next" onClick={() => goToPage(memberSafePage + 1)}>
              <ChevronDown className="rotate-minus-90" size={16} />
            </button>
            <button type="button" disabled={memberSafePage === memberTotalPages} data-testid="organization-members-page-last" onClick={() => goToPage(memberTotalPages)}>
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgDocumentsTab({
  docPageRows,
  docPaginationPages,
  docSafePage,
  docTotalPages,
  documents,
  isLoading,
  language,
  onNavigate,
  setDocumentsPage,
  setViewingDoc,
  t,
}) {
  function goToPage(p) {
    setDocumentsPage(Math.min(Math.max(p, 1), docTotalPages));
  }

  return (
    <div className="organization-details-tab-shell plans-management-page documents-management-page">
      <div className="users-table-shell plans-table-shell">
        <div className="users-table-scroll plans-table-scroll">
          <table
            className="plans-table documents-table documents-table--embedded"
            data-testid="organization-documents-table"
          >
            <thead>
              <tr>
                <th>{t("documentsManagement.titleCol")}</th>
                <th>{t("documentsManagement.uploadedBy")}</th>
                <th>{t("documentsManagement.issuanceDate")}</th>
                <th>{t("documentsManagement.status")}</th>
                <th>{t("documentsManagement.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="plans-empty-cell">
                    …
                  </td>
                </tr>
              )}
              {!isLoading && documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="plans-empty-cell">
                    {t("organizationDetails.noDocuments")}
                  </td>
                </tr>
              )}
              {!isLoading &&
                docPageRows.map((doc) => {
                  const title = doc.title || doc.fileName || "—";
                  const docType = doc.documentType || "—";
                  const uploader = doc.uploadedByName || doc.certifiedByName || "—";
                  const uploaderEmail = String(doc.uploadedByEmail || doc.certifiedByEmail || "").trim();
                  const uploaderRole = String(doc.uploadedByRole || doc.certifiedByRole || "").trim();
                  const uploaderSecondLine = uploaderEmail || uploaderRole || "";
                  const uploaderUserId = getDocumentUploaderUserId(doc);
                  const listStatusKey = getDocumentListStatusKey(doc);
                  const statusBadgeClass =
                    listStatusKey === "certified"
                      ? "plans-badge plans-badge--recommended"
                      : listStatusKey === "rejected"
                        ? "plans-badge plans-badge--danger"
                        : listStatusKey === "uploaded"
                          ? "plans-badge plans-badge--info"
                          : "plans-badge plans-badge--warning";
                  const fileUrl = String(doc.fileUrl || "").trim();

                  return (
                    <tr key={doc.id}>
                      <td className="documents-name-cell">
                        <div className="users-name-cell documents-name-cell-inner">
                          <DocumentAvatarThumb doc={doc} size={32} />
                          <span>
                            <strong>{title}</strong>
                            <small className="plans-management-desc-preview">{docType}</small>
                          </span>
                        </div>
                      </td>
                      <td className="documents-uploader-cell">
                        <div className="documents-uploader-lines">
                          {uploaderUserId ? (
                            <button
                              type="button"
                              className="documents-uploader-name documents-uploader-name--link"
                              data-testid="organization-doc-uploader-link"
                              onClick={() => onNavigate(`/users/${encodeURIComponent(uploaderUserId)}`)}
                            >
                              {uploader}
                            </button>
                          ) : (
                            <span className="documents-uploader-name">{uploader}</span>
                          )}
                          <span className="documents-uploader-meta">{uploaderSecondLine || "—"}</span>
                        </div>
                      </td>
                      <td>{doc.issuanceDate ? formatDateStr(doc.issuanceDate, language) : formatDateValue(doc.createdAt, language)}</td>
                      <td>
                        <span className={statusBadgeClass} data-testid={`organization-doc-status-${listStatusKey}`}>
                          {t(`documentsManagement.statuses.${listStatusKey}`)}
                        </span>
                      </td>
                      <td>
                        <div className="plans-actions-cell documents-actions-cell documents-row-icon-actions">
                          {fileUrl ? (
                            <a
                              className="documents-icon-action documents-icon-action--file"
                              data-testid="organization-doc-action-file"
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t("documentsManagement.viewFile")}
                              aria-label={t("documentsManagement.viewFile")}
                            >
                              <ExternalLink size={18} />
                            </a>
                          ) : (
                            <span
                              className="documents-icon-action documents-icon-action--file documents-icon-action--disabled"
                              data-testid="organization-doc-action-file-disabled"
                              aria-label={t("documentsManagement.viewFile")}
                            >
                              <ExternalLink size={18} />
                            </span>
                          )}
                          <button
                            type="button"
                            className="documents-icon-action documents-icon-action--details"
                            data-testid="organization-doc-action-details"
                            aria-label={t("documentsManagement.viewDetails")}
                            title={t("documentsManagement.viewDetails")}
                            onClick={() => setViewingDoc(doc)}
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && documents.length > 0 && (
        <div className="users-pagination billing-users-pagination documents-pagination-footer">
          <span className="users-pagination-meta" data-testid="organization-documents-pagination-meta">
            {docSafePage} / {docTotalPages} · {documents.length}
          </span>
          <div className="billing-pagination-buttons">
            <button type="button" disabled={docSafePage === 1} data-testid="organization-documents-page-first" onClick={() => goToPage(1)}>
              <ChevronsLeft size={16} />
            </button>
            <button type="button" disabled={docSafePage === 1} data-testid="organization-documents-page-prev" onClick={() => goToPage(docSafePage - 1)}>
              <ChevronDown className="rotate-90" size={16} />
            </button>
            {docPaginationPages.map((page) => (
              <button
                className={page === docSafePage ? "is-active" : ""}
                type="button"
                key={page}
                data-testid={`organization-documents-page-${page}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
            <button type="button" disabled={docSafePage === docTotalPages} data-testid="organization-documents-page-next" onClick={() => goToPage(docSafePage + 1)}>
              <ChevronDown className="rotate-minus-90" size={16} />
            </button>
            <button type="button" disabled={docSafePage === docTotalPages} data-testid="organization-documents-page-last" onClick={() => goToPage(docTotalPages)}>
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ORG_PAYMENTS_PAGE_SIZE = 10;

function OrgPaymentsTableShimmerRows({ rowCount }) {
  return Array.from({ length: rowCount }, (_, index) => (
    <tr className="users-shimmer-row" key={`organization-payments-shimmer-${index}`}>
      <td className="users-checkbox-cell">
        <span className="users-shimmer users-shimmer-checkbox" />
      </td>
      <td>
        <div className="users-shimmer-lines">
          <span className="users-shimmer users-shimmer-line users-shimmer-line--date" />
          <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
        </div>
      </td>
      <td className="plans-table-price">
        <span className="users-shimmer users-shimmer-line users-shimmer-line--role" />
      </td>
      <td>
        <span className="users-shimmer users-shimmer-pill" />
      </td>
      <td>
        <span className="users-shimmer-actions">
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
        </span>
      </td>
    </tr>
  ));
}

export function OrgPaymentsTab({ getUserProfileUseCase, isLoading, language, payments, t, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailPayment, setDetailPayment] = useState(null);
  const [alert, setAlert] = useState(null);

  const stats = useMemo(() => {
    const paidPayments = payments.filter((p) => p.status === "paid");
    const cancelledPayments = payments.filter((p) => ["cancelled", "failed", "refunded"].includes(p.status));
    const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const cancelledAmount = cancelledPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const currency = payments[0]?.currency || "SAR";
    return {
      cancelledAmount,
      currency,
      totalRevenue,
      totalTransactions: payments.length,
    };
  }, [payments]);

  const visiblePayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return [
        p.id,
        p.paymentId,
        p.invoiceId,
        p.description,
        p.userId,
        p.orgId,
        p.cardBrand,
        p.maskedCardNumber,
        p.purpose,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [payments, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visiblePayments.length / ORG_PAYMENTS_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagePayments = visiblePayments.slice((safePage - 1) * ORG_PAYMENTS_PAGE_SIZE, safePage * ORG_PAYMENTS_PAGE_SIZE);
  const paginationPages = getPaginationPages(safePage, totalPages);

  const openSubscriberForPayment = useCallback(
    async (payment) => {
      const uid = String(payment.userId || "").trim();
      const directOrg = String(payment.orgId || "").trim();
      if (directOrg) {
        onNavigate(`/organizations/${encodeURIComponent(directOrg)}`);
        return;
      }
      if (!uid) {
        setAlert({ message: t("billing.noSubscriberUser"), variant: "error" });
        return;
      }
      if (!isOrganizationPayment(payment)) {
        onNavigate(`/users/${encodeURIComponent(uid)}`);
        return;
      }
      if (!getUserProfileUseCase) {
        setAlert({ message: t("billing.subscriberNavigateError"), variant: "error" });
        return;
      }
      try {
        const profile = await getUserProfileUseCase.execute({ userId: uid });
        const orgId = String(profile?.user?.orgId || "").trim();
        if (orgId) {
          onNavigate(`/organizations/${encodeURIComponent(orgId)}`);
        } else {
          onNavigate(`/users/${encodeURIComponent(uid)}`);
        }
      } catch (e) {
        setAlert({
          message: e?.message || t("billing.subscriberNavigateError"),
          variant: "error",
        });
      }
    },
    [getUserProfileUseCase, onNavigate, t],
  );

  function goToPage(n) {
    setCurrentPage(Math.min(Math.max(n, 1), totalPages));
  }

  function paymentRowLabel(p) {
    const sid = !p?.id ? "-" : p.id.length > 12 ? `${p.id.slice(0, 8)}…` : p.id;
    return String(p.description || p.paymentId || p.id || "").trim() || sid;
  }

  function handleExportExcel() {
    const headers = [
      t("billing.exportCols.date"),
      t("billing.exportCols.paymentId"),
      t("billing.exportCols.description"),
      t("billing.exportCols.purpose"),
      t("billing.exportCols.amount"),
      t("billing.exportCols.currency"),
      t("billing.exportCols.status"),
      t("billing.exportCols.method"),
      t("billing.exportCols.cardBrand"),
      t("billing.exportCols.maskedCardNumber"),
      t("billing.exportCols.invoiceId"),
      t("billing.exportCols.providerCreatedAt"),
    ];
    const body = visiblePayments.map((p) => [
      formatBillingPaymentDate(p.createdAt, language),
      p.paymentId ?? "",
      p.description ?? "",
      p.purpose ?? "",
      Number(p.amount) || 0,
      p.currency ?? "",
      p.status ?? "",
      p.method ?? "",
      p.cardBrand ?? "",
      p.maskedCardNumber ?? "",
      p.invoiceId ?? "",
      p.providerCreatedAt ?? "",
    ]);
    const aoa = [headers, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 36 },
      { wch: 28 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("billing.exportSheetName"));
    XLSX.writeFile(wb, `organization-payments-${Date.now()}.xlsx`);
  }

  return (
    <div
      className="organization-details-tab-shell organization-details-payments-nested users-management-page plans-management-page billing-payments-page"
      data-testid="organization-payments-tab"
    >
      <div className="billing-stats-grid">
        <div className="billing-stat-card">
          <div className="billing-stat-icon billing-stat-icon--green">
            <CreditCard size={16} />
          </div>
          <div className="billing-stat-body">
            <p className="billing-stat-label">{t("billing.totalRevenue")}</p>
            {isLoading ? (
              <div className="billing-stat-shimmer" />
            ) : (
              <p className="billing-stat-value">{formatBillingCurrency(stats.totalRevenue, stats.currency, language)}</p>
            )}
            <p className="billing-stat-sub">
              {isLoading ? "" : t("billing.completedTransactions", { count: payments.filter((p) => p.status === "paid").length })}
            </p>
          </div>
        </div>

        <div className="billing-stat-card">
          <div className="billing-stat-icon billing-stat-icon--red">
            <FileX size={16} />
          </div>
          <div className="billing-stat-body">
            <p className="billing-stat-label">{t("billing.cancelledPayment")}</p>
            {isLoading ? (
              <div className="billing-stat-shimmer" />
            ) : (
              <p className="billing-stat-value">{formatBillingCurrency(stats.cancelledAmount, stats.currency, language)}</p>
            )}
            <p className="billing-stat-sub">
              {isLoading
                ? ""
                : t("billing.cancelledTransactions", {
                    count: payments.filter((p) => ["cancelled", "failed", "refunded"].includes(p.status)).length,
                  })}
            </p>
          </div>
        </div>

        <div className="billing-stat-card">
          <div className="billing-stat-icon billing-stat-icon--orange">
            <RefreshCw size={16} />
          </div>
          <div className="billing-stat-body">
            <p className="billing-stat-label">{t("billing.numberOfTransactions")}</p>
            {isLoading ? (
              <div className="billing-stat-shimmer" />
            ) : (
              <p className="billing-stat-value">{stats.totalTransactions.toLocaleString()}</p>
            )}
            <p className="billing-stat-sub">{t("billing.allTransactions")}</p>
          </div>
        </div>
      </div>

      <div className="users-toolbar">
        <AppAlert message={alert?.message} variant={alert?.variant} onClose={() => setAlert(null)} />
        <div className="users-toolbar-actions">
          <label className="users-search">
            <Search size={18} />
            <input
              type="search"
              placeholder={t("billing.search")}
              value={searchQuery}
              data-testid="organization-payments-search"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <label className="users-filter-select">
            <select value={statusFilter} data-testid="organization-payments-status-filter" onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{t("billing.allStatuses")}</option>
              <option value="paid">{t("billing.statuses.paid")}</option>
              <option value="pending">{t("billing.statuses.pending")}</option>
              <option value="failed">{t("billing.statuses.failed")}</option>
              <option value="refunded">{t("billing.statuses.refunded")}</option>
              <option value="cancelled">{t("billing.statuses.cancelled")}</option>
            </select>
            <ChevronDown size={16} />
          </label>

          <button
            type="button"
            className="billing-toolbar-excel-button"
            data-testid="organization-payments-export-xlsx"
            disabled={visiblePayments.length === 0 || isLoading}
            aria-label={t("billing.exportExcel")}
            onClick={handleExportExcel}
          >
            <Download size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="users-table-shell plans-table-shell billing-payments-table-shell">
        <div className="users-table-scroll plans-table-scroll">
          <table className="plans-table payments-table" data-testid="organization-payments-table">
            <thead>
              <tr>
                <th className="users-checkbox-cell">
                  <input
                    type="checkbox"
                    disabled
                    aria-label={t("billing.selectAll")}
                    data-testid="organization-payments-select-all-placeholder"
                  />
                </th>
                <th>{t("billing.cols.summary")}</th>
                <th>{t("billing.cols.amount")}</th>
                <th>{t("billing.cols.status")}</th>
                <th>{t("billing.cols.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <OrgPaymentsTableShimmerRows rowCount={ORG_PAYMENTS_PAGE_SIZE} />}

              {!isLoading && visiblePayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="plans-empty-cell">
                    {payments.length === 0 ? t("organizationDetails.noPayments") : t("billing.empty")}
                  </td>
                </tr>
              )}

              {!isLoading &&
                pagePayments.map((payment) => (
                  <tr key={payment.id} data-testid={`organization-payment-row-${payment.id}`}>
                    <td className="users-checkbox-cell">
                      <input type="checkbox" disabled aria-label={t("billing.selectPayment", { label: paymentRowLabel(payment) })} />
                    </td>
                    <td>
                      <span className="billing-payment-summary-date">{formatBillingPaymentDate(payment.createdAt, language)}</span>
                      {payment.description ? (
                        <div className="billing-payment-summary-desc">{payment.description}</div>
                      ) : null}
                    </td>
                    <td className="plans-table-price">{formatBillingCurrency(payment.amount, payment.currency, language)}</td>
                    <td>
                      <span className={`billing-status-pill billing-status-pill--${payment.status}`}>
                        {t(`billing.statuses.${payment.status}`) || payment.status}
                      </span>
                    </td>
                    <td>
                      <div className="plans-actions-cell">
                        <button
                          type="button"
                          className="plans-action-edit"
                          aria-label={t("billing.openDetails")}
                          data-testid={`organization-payment-details-${payment.id}`}
                          onClick={() => setDetailPayment(payment)}
                        >
                          <Eye size={20} strokeWidth={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="plans-action-edit"
                          aria-label={
                            isOrganizationPayment(payment)
                              ? t("billing.openOrganizationProfile")
                              : t("billing.openIndividualProfile")
                          }
                          data-testid={`organization-payment-subscriber-${payment.id}`}
                          disabled={!String(payment.userId || "").trim() && !String(payment.orgId || "").trim()}
                          onClick={() => void openSubscriberForPayment(payment)}
                        >
                          {isOrganizationPayment(payment) ? (
                            <Building2 size={20} strokeWidth={1.75} aria-hidden />
                          ) : (
                            <User size={20} strokeWidth={1.75} aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          className="plans-action-edit"
                          aria-label={t("billing.downloadPdf")}
                          data-testid={`organization-payment-pdf-${payment.id}`}
                          onClick={() => void downloadPaymentPdf(payment, language, t)}
                        >
                          <Printer size={20} strokeWidth={1.75} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!isLoading && visiblePayments.length > 0 && (
          <div className="users-pagination billing-users-pagination">
            <span className="users-pagination-meta" data-testid="organization-payments-pagination-meta">
              {t("billing.paginationMeta", {
                current: safePage,
                total: totalPages,
                count: visiblePayments.length,
              })}
            </span>
            <div className="billing-pagination-buttons">
              <button type="button" disabled={safePage === 1} data-testid="organization-payments-page-first" onClick={() => goToPage(1)}>
                <ChevronsLeft size={16} />
              </button>
              <button type="button" disabled={safePage === 1} data-testid="organization-payments-page-prev" onClick={() => goToPage(safePage - 1)}>
                <ChevronDown className="rotate-90" size={16} />
              </button>
              {paginationPages.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={page === safePage ? "is-active" : ""}
                  data-testid={`organization-payments-page-${page}`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button type="button" disabled={safePage === totalPages} data-testid="organization-payments-page-next" onClick={() => goToPage(safePage + 1)}>
                <ChevronDown className="rotate-minus-90" size={16} />
              </button>
              <button type="button" disabled={safePage === totalPages} data-testid="organization-payments-page-last" onClick={() => goToPage(totalPages)}>
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailPayment ? (
        <PaymentDetailsDialog
          language={language}
          payment={detailPayment}
          t={t}
          onClose={() => setDetailPayment(null)}
          onOpenSubscriber={() => {
            const p = detailPayment;
            setDetailPayment(null);
            void openSubscriberForPayment(p);
          }}
        />
      ) : null}
    </div>
  );
}

const SUBSCRIPTION_FIELD_KEYS = [
  "certificationsLimit",
  "certificationsUsed",
  "createdAt",
  "currentMembersCount",
  "endDate",
  "extraCertificationsAmount",
  "extraCertificationsCount",
  "extraMembersAmount",
  "extraMembersCount",
  "lastModified",
  "membersLimit",
  "packageName",
  "period",
  "price",
  "startDate",
  "status",
];

function formatSubscriptionFieldValue(key, sub, language) {
  const v = sub[key];
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "—";
    return formatDateValue(v, language);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US").format(v);
  }
  return String(v);
}

function shouldShowSubscriptionFieldValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (typeof value === "number" && value === 0) return false;
  return true;
}

const SUBSCRIPTION_FIELD_GROUPS = [
  {
    name: "usage",
    keys: ["certificationsLimit", "certificationsUsed", "membersLimit", "currentMembersCount"],
  },
  {
    name: "planInfo",
    keys: ["period", "price", "startDate", "endDate", "status"],
  },
  {
    name: "extras",
    keys: ["extraCertificationsAmount", "extraCertificationsCount", "extraMembersAmount", "extraMembersCount"],
  },
];

function getSubscriptionGroupFields(subscription, group) {
  return group.keys
    .map((key) => ({ key, value: subscription[key] }))
    .filter(({ value }) => shouldShowSubscriptionFieldValue(value));
}

export function OrgSubscriptionTab({ language, listsLoading, subscriptions, t }) {
  if (listsLoading) {
    return (
      <div className="organization-details-tab-stack" data-testid="organization-subscription-tab">
        <p className="organization-details-muted" data-testid="organization-subscription-loading">
          …
        </p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="organization-details-tab-stack" data-testid="organization-subscription-tab">
        <p className="organization-details-muted" data-testid="organization-subscription-empty">
          {t("organizationDetails.noSubscriptions")}
        </p>
      </div>
    );
  }

  const latestSubscription = subscriptions[0];

  return (
    <div className="organization-details-tab-stack" data-testid="organization-subscription-tab">
      {subscriptions.map((subscription) => (
        <section
          key={subscription.id}
          className="organization-details-info-card"
          data-testid={`organization-subscription-card-${subscription.id}`}
        >
          <h3 className="organization-details-info-card-title">
            {subscription.packageName || t("organizationDetails.subscriptionCardTitle")}
          </h3>
          <div className="organization-details-subscription-groups">
            {SUBSCRIPTION_FIELD_GROUPS.map((group) => {
              const fields = getSubscriptionGroupFields(subscription, group);
              if (fields.length === 0) return null;

              return (
                <section className="organization-details-subscription-group-card" key={group.name}>
                  <h4>{t(`organizationDetails.subscriptionGroups.${group.name}`)}</h4>
                  <dl className="billing-payment-detail-dl organization-details-card-dl organization-details-subscription-dl">
                    {fields.map(({ key }) => (
                      <div key={key}>
                        <dt>{t(`organizationDetails.subscriptionFields.${key}`)}</dt>
                        <dd>{formatSubscriptionFieldValue(key, subscription, language)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function OrgLogoPreviewDialog({ open, logoUrl, name, onClose, t }) {
  if (!open) return null;
  return (
    <div className="image-dialog-overlay" role="dialog" aria-modal="true" aria-label={t("organizationDetails.logoPreview") || "Logo preview"}>
      <div className="user-image-dialog">
        <div className="user-image-dialog-header">
          <strong>{name}</strong>
          <button type="button" onClick={onClose} aria-label={t("organizationDetails.closePreview") || "Close preview"}>
            ×
          </button>
        </div>
        {logoUrl ? (
          <img className="user-image-preview" src={logoUrl} alt={name} />
        ) : (
          <div className="user-image-preview--placeholder">{getInitials(name)}</div>
        )}
      </div>
    </div>
  );
}

export function OrgBlockchainTab({ organization, t }) {
  const rows = [
    { key: "org-contract", label: t("organizationDetails.fields.orgContractAddress"), value: organization.contractAddress },
    { key: "org-state", label: t("organizationDetails.fields.contractStatus"), value: organization.contractStatus },
    { key: "owner-wallet", label: t("organizationDetails.fields.walletAddress"), value: organization.ownerWalletAddress },
    { key: "owner-contract", label: t("organizationDetails.fields.ownerContractAddress"), value: organization.ownerContractAddress },
    { key: "owner-state", label: t("organizationDetails.fields.ownerContractStatus"), value: organization.ownerContractState },
  ].filter((r) => String(r.value ?? "").trim());

  return (
    <div className="organization-details-tab-stack" data-testid="organization-blockchain-tab">
      <section className="organization-details-info-card">
        <h3 className="organization-details-info-card-title">{t("organizationDetails.blockchainCardTitle")}</h3>
        <dl className="billing-payment-detail-dl organization-details-card-dl">
          {rows.map((r) => (
            <div key={r.key}>
              <dt>{r.label}</dt>
              <dd className="organization-details-mono">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
