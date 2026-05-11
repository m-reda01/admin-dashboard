import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Pencil,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { ManagementIndexLayout } from "../layouts/ManagementIndexLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const ORGANIZATIONS_PAGE_SIZE = 10;

export function OrganizationsManagementPage({ listOrganizationsUseCase, onNavigate, session }) {
  const { language, t } = useI18n();
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      setIsLoading(true);
      setError("");

      try {
        const nextOrganizations = await listOrganizationsUseCase.execute({ pageSize: 50 });
        if (isMounted) {
          setOrganizations(nextOrganizations);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || t("organizationsManagement.loadError"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, [listOrganizationsUseCase, t]);

  const visibleOrganizations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return organizations.filter((organization) => {
      const isStatusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && organization.isActive) ||
        (statusFilter === "inactive" && !organization.isActive);

      if (!isStatusMatch) return false;
      if (!normalizedQuery) return true;

      return [
        organization.name,
        organization.description,
        organization.ownerUid,
        organization.orgId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [organizations, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleOrganizations.length / ORGANIZATIONS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageOrganizations = visibleOrganizations.slice(
    (safeCurrentPage - 1) * ORGANIZATIONS_PAGE_SIZE,
    safeCurrentPage * ORGANIZATIONS_PAGE_SIZE,
  );
  const pageOrganizationIds = useMemo(
    () => pageOrganizations.map((organization) => organization.id),
    [pageOrganizations],
  );
  const selectedVisibleCount = pageOrganizationIds.filter((id) => selectedOrganizationIds.has(id)).length;
  const isAllVisibleSelected =
    pageOrganizationIds.length > 0 && selectedVisibleCount === pageOrganizationIds.length;
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;
  const paginationPages = getPaginationPages(safeCurrentPage, totalPages);
  const selectedOrganizations = useMemo(
    () => organizations.filter((organization) => selectedOrganizationIds.has(organization.id)),
    [organizations, selectedOrganizationIds],
  );
  const isSelectionMode = selectedOrganizations.length > 0;

  function handleSelectAllVisible(event) {
    const shouldSelect = event.target.checked;
    setSelectedOrganizationIds((currentIds) => {
      const nextIds = new Set(currentIds);
      pageOrganizationIds.forEach((id) => {
        if (shouldSelect) {
          nextIds.add(id);
        } else {
          nextIds.delete(id);
        }
      });
      return nextIds;
    });
  }

  function handleSelectOrganization(organizationId, shouldSelect) {
    setSelectedOrganizationIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (shouldSelect) {
        nextIds.add(organizationId);
      } else {
        nextIds.delete(organizationId);
      }
      return nextIds;
    });
  }

  function goToPage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handleUnavailableAction() {
    setAlert({
      message: t("organizationsManagement.actionUnavailable"),
      variant: "error",
    });
  }

  return (
    <DashboardLayout
      activePage="organizations"
      onNavigate={onNavigate}
      session={session}
      title={t("organizationsManagement.title")}
    >
      <ManagementIndexLayout
        className="organizations-management-page"
        toolbarAlert={
          <AppAlert message={alert?.message} variant={alert?.variant} onClose={() => setAlert(null)} />
        }
        toolbarActions={
          <>
            <label className="users-search">
              <Search size={18} />
              <input
                type="search"
                disabled={isSelectionMode}
                placeholder={t("organizationsManagement.search")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <label className="users-filter-select">
              <select
                value={statusFilter}
                disabled={isSelectionMode}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">{t("organizationsManagement.allStatuses")}</option>
                <option value="active">{t("organizationsManagement.active")}</option>
                <option value="inactive">{t("organizationsManagement.inactive")}</option>
              </select>
              <ChevronDown size={16} />
            </label>
            {isSelectionMode && (
              <button className="users-bulk-delete-button" type="button" onClick={handleUnavailableAction}>
                <Trash2 size={16} />
                {t("organizationsManagement.deleteSelected", { count: selectedOrganizations.length })}
              </button>
            )}
          </>
        }
      >
        <div className="users-table-shell">
          <div className="users-table-scroll">
            <table className="users-table organizations-table">
              <colgroup>
                <col className="users-col-checkbox" />
                <col className="organizations-col-name" />
                <col className="organizations-col-number" />
                <col className="users-col-status" />
                <col className="users-col-date" />
                <col className="users-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th className="users-checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={t("organizationsManagement.selectAll")}
                      checked={isAllVisibleSelected}
                      disabled={pageOrganizations.length === 0}
                      ref={(element) => {
                        if (element) element.indeterminate = isSomeVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                    />
                  </th>
                  <th>{t("organizationsManagement.organization")}</th>
                  <th>
                    <span className="users-sort-heading">{t("organizationsManagement.usersNumber")}</span>
                  </th>
                  <th>{t("organizationsManagement.status")}</th>
                  <th>
                    <span className="users-sort-heading">{t("organizationsManagement.dateJoined")}</span>
                  </th>
                  <th>{t("organizationsManagement.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <OrganizationsTableShimmerRows />}

                {!isLoading && error && (
                  <tr>
                    <td className="users-empty-cell users-empty-cell--error" colSpan={6}>
                      {t("organizationsManagement.loadError")}
                    </td>
                  </tr>
                )}

                {!isLoading && !error && visibleOrganizations.length === 0 && (
                  <tr>
                    <td className="users-empty-cell" colSpan={6}>
                      {t("organizationsManagement.empty")}
                    </td>
                  </tr>
                )}

                {!isLoading && !error && pageOrganizations.map((organization) => (
                  <tr
                    className={selectedOrganizationIds.has(organization.id) ? "is-selected" : ""}
                    key={organization.id}
                  >
                    <td className="users-checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label={`${t("organizationsManagement.selectOrganization")} ${organization.name}`}
                        checked={selectedOrganizationIds.has(organization.id)}
                        onChange={(event) => handleSelectOrganization(organization.id, event.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="users-name-cell">
                        <OrganizationAvatar organization={organization} />
                        <span>
                          <strong>{organization.name}</strong>
                          <small>{organization.description?.trim() ? organization.description : "—"}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="organizations-count-cell">
                        <UsersRound size={15} />
                        {organization.membersCount}
                      </span>
                    </td>
                    <td>
                      <StatusPill
                        tone={organization.isActive ? "activated" : "deactivated"}
                        value={organization.isActive
                          ? t("organizationsManagement.activated")
                          : t("organizationsManagement.deactivated")}
                      />
                    </td>
                    <td>{formatDate(organization.createdAt, language)}</td>
                    <td>
                      <div className="users-actions-cell">
                        <button
                          type="button"
                          aria-label={t("organizationsManagement.view")}
                          data-testid={`organizations-view-${organization.id}`}
                          disabled={isSelectionMode}
                          onClick={() => onNavigate(`/organizations/${encodeURIComponent(organization.id)}`)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          type="button"
                          aria-label={t("organizationsManagement.edit")}
                          data-testid={`organizations-edit-${organization.id}`}
                          disabled={isSelectionMode}
                          onClick={() => onNavigate(`/organizations/${encodeURIComponent(organization.id)}`)}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          aria-label={t("organizationsManagement.delete")}
                          disabled={isSelectionMode}
                          onClick={handleUnavailableAction}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="users-pagination">
            <button type="button" disabled={isSelectionMode || safeCurrentPage === 1} onClick={() => goToPage(1)}><ChevronsLeft size={16} /></button>
            <button type="button" disabled={isSelectionMode || safeCurrentPage === 1} onClick={() => goToPage(safeCurrentPage - 1)}><ChevronDown className="rotate-90" size={16} /></button>
            {paginationPages.map((page) => (
              <button
                className={page === safeCurrentPage ? "is-active" : ""}
                type="button"
                key={page}
                disabled={isSelectionMode}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
            <button type="button" disabled={isSelectionMode || safeCurrentPage === totalPages} onClick={() => goToPage(safeCurrentPage + 1)}><ChevronDown className="rotate-minus-90" size={16} /></button>
            <button type="button" disabled={isSelectionMode || safeCurrentPage === totalPages} onClick={() => goToPage(totalPages)}><ChevronsRight size={16} /></button>
          </div>
        </div>
      </ManagementIndexLayout>
    </DashboardLayout>
  );
}

function OrganizationsTableShimmerRows() {
  return Array.from({ length: ORGANIZATIONS_PAGE_SIZE }, (_, index) => (
    <tr className="users-shimmer-row" key={`organizations-shimmer-${index}`}>
      <td className="users-checkbox-cell">
        <span className="users-shimmer users-shimmer-checkbox" />
      </td>
      <td>
        <div className="users-shimmer-name">
          <span className="users-shimmer users-shimmer-avatar" />
          <span className="users-shimmer-lines">
            <span className="users-shimmer users-shimmer-line users-shimmer-line--name" />
            <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
          </span>
        </div>
      </td>
      <td><span className="users-shimmer users-shimmer-line users-shimmer-line--role" /></td>
      <td><span className="users-shimmer users-shimmer-pill" /></td>
      <td><span className="users-shimmer users-shimmer-line users-shimmer-line--date" /></td>
      <td>
        <span className="users-shimmer-actions">
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
        </span>
      </td>
    </tr>
  ));
}

function OrganizationAvatar({ organization }) {
  if (organization.logoUrl) {
    return <img className="users-avatar users-avatar-image" src={organization.logoUrl} alt="" />;
  }

  return (
    <span className="users-avatar organizations-avatar">
      <BriefcaseBusiness size={14} />
    </span>
  );
}

function StatusPill({ tone, value }) {
  return <span className={`users-pill users-pill--${tone}`}>{value}</span>;
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage === 1) return [1, 2, 3];
  if (currentPage === totalPages) return [totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 1, currentPage, currentPage + 1];
}

function formatDate(date, language) {
  if (!date) return "-";

  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
