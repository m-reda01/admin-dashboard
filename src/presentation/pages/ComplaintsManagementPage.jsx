import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Pencil,
  Search,
} from "lucide-react";
import {
  ComplaintEditDialog,
  complaintStatusOptionLabel,
  formatComplaintDate,
} from "../complaints/complaintAdminShared.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";

const PAGE_SIZE = 10;
const STATUS_FILTER_PRESETS = ["open", "pending", "resolved", "closed", "rejected"];

export function ComplaintsManagementPage({ listComplaintsUseCase, session, updateComplaintStatusUseCase, onNavigate }) {
  const { language, t } = useI18n();
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState("");
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const reloadComplaintsSilent = useCallback(async () => {
    if (!listComplaintsUseCase) return;
    try {
      const rows = await listComplaintsUseCase.execute({ pageSize: 300 });
      setComplaints(rows);
      setComplaintsError("");
    } catch (e) {
      setComplaintsError(e?.message || t("complaintsManagement.loadError"));
    }
  }, [listComplaintsUseCase, t]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!listComplaintsUseCase) return;
      setComplaintsLoading(true);
      setComplaintsError("");
      try {
        const rows = await listComplaintsUseCase.execute({ pageSize: 300 });
        if (!cancelled) setComplaints(rows);
      } catch (e) {
        if (!cancelled) setComplaintsError(e?.message || t("complaintsManagement.loadError"));
      } finally {
        if (!cancelled) setComplaintsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [listComplaintsUseCase, t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(complaints.map((r) => r.id));
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
        else changed = true;
      });
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [complaints]);

  const visibleComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return complaints.filter((row) => {
      if (statusFilter !== "all") {
        const rowStatus = String(row.status ?? "").trim().toLowerCase();
        if (rowStatus !== statusFilter.toLowerCase()) return false;
      }
      if (!q) return true;
      const blob = [
        row.userDisplayName,
        row.userEmail,
        row.description,
        row.typeLabel,
        row.typeKey,
        row.status,
        row.userId,
        row.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [complaints, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleComplaints.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageComplaints = visibleComplaints.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageComplaintIds = useMemo(() => pageComplaints.map((r) => r.id), [pageComplaints]);
  const selectedVisibleCount = pageComplaintIds.filter((id) => selectedIds.has(id)).length;
  const isAllVisibleSelected = pageComplaintIds.length > 0 && selectedVisibleCount === pageComplaintIds.length;
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;
  const isSelectionMode = selectedIds.size > 0;
  const paginationPages = getPaginationPages(safePage, totalPages);

  const canEditStatus = Boolean(updateComplaintStatusUseCase);
  const tableColSpan = 7;

  function handleSelectAllVisible(event) {
    const shouldSelect = event.target.checked;
    setSelectedIds((cur) => {
      const next = new Set(cur);
      pageComplaintIds.forEach((id) => (shouldSelect ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function handleSelectComplaint(id, shouldSelect) {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      shouldSelect ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function goToPage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function statusBadgeClass(status) {
    const key = String(status || "").trim().toLowerCase();
    if (key === "open" || key === "pending") return "plans-badge plans-badge--warning";
    if (key === "resolved" || key === "closed") return "plans-badge plans-badge--recommended";
    if (key === "rejected") return "plans-badge plans-badge--danger";
    return "plans-badge plans-badge--info";
  }

  return (
    <DashboardLayout activePage="complaints" onNavigate={onNavigate} session={session} title={t("complaintsManagement.title")}>
      <div className="users-management-page plans-management-page documents-management-page" data-testid="complaints-management-page">
        <div className="users-toolbar">
          <div className="users-toolbar-actions">
            <label className="users-search">
              <Search size={18} aria-hidden />
              <input
                type="search"
                disabled={isSelectionMode}
                placeholder={t("complaintsManagement.search")}
                value={searchQuery}
                data-testid="complaints-search-input"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <label className="users-filter-select">
              <select
                value={statusFilter}
                disabled={isSelectionMode}
                data-testid="complaints-status-filter"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">{t("complaintsManagement.allStatuses")}</option>
                {STATUS_FILTER_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {complaintStatusOptionLabel(preset, t)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden />
            </label>
          </div>
        </div>

        <div className="users-table-shell plans-table-shell">
          <div className="users-table-scroll plans-table-scroll">
            <table className="plans-table documents-table documents-table--complaints-list" data-testid="complaints-management-table">
              <thead>
                <tr>
                  <th className="users-checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={t("complaintsManagement.selectAll")}
                      checked={isAllVisibleSelected}
                      data-testid="complaints-select-all"
                      disabled={pageComplaintIds.length === 0 || complaintsLoading || Boolean(complaintsError)}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected && !isAllVisibleSelected;
                      }}
                      onChange={handleSelectAllVisible}
                    />
                  </th>
                  <th>{t("complaintsManagement.reporterColumn")}</th>
                  <th>{t("userDetails.complaintType")}</th>
                  <th>{t("userDetails.complaintDescription")}</th>
                  <th>{t("userDetails.complaintDatesColumn")}</th>
                  <th>{t("documentsManagement.status")}</th>
                  <th>{t("documentsManagement.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {complaintsLoading ? <ComplaintsTableShimmerRows rowCount={PAGE_SIZE} /> : null}

                {!complaintsLoading && complaintsError ? (
                  <tr>
                    <td className="plans-empty-cell plans-empty-cell--error" colSpan={tableColSpan} data-testid="complaints-management-error">
                      {complaintsError}
                    </td>
                  </tr>
                ) : null}

                {!complaintsLoading && !complaintsError && visibleComplaints.length === 0 ? (
                  <tr>
                    <td className="plans-empty-cell" colSpan={tableColSpan}>
                      {t("complaintsManagement.empty")}
                    </td>
                  </tr>
                ) : null}

                {!complaintsLoading &&
                  !complaintsError &&
                  pageComplaints.map((row) => {
                    const uid = String(row.userId ?? "").trim();
                    return (
                      <tr key={row.id} className={selectedIds.has(row.id) ? "is-selected" : ""} data-testid={`complaints-management-row-${row.id}`}>
                        <td className="users-checkbox-cell">
                          <input
                            type="checkbox"
                            aria-label={`${t("complaintsManagement.selectComplaint")} ${row.id}`}
                            checked={selectedIds.has(row.id)}
                            data-testid={`complaints-row-checkbox-${row.id}`}
                            onChange={(e) => handleSelectComplaint(row.id, e.target.checked)}
                          />
                        </td>
                        <td className="documents-uploader-cell">
                          <div className="documents-uploader-lines">
                            {uid ? (
                              <button
                                type="button"
                                className="documents-uploader-name documents-uploader-name--link"
                                data-testid={`complaints-reporter-link-${row.id}`}
                                disabled={isSelectionMode}
                                onClick={() => onNavigate(`/users/${encodeURIComponent(uid)}`)}
                              >
                                {row.userDisplayName || "—"}
                              </button>
                            ) : (
                              <span className="documents-uploader-name">{row.userDisplayName || "—"}</span>
                            )}
                            <span className="documents-uploader-meta">{row.userEmail || "—"}</span>
                          </div>
                        </td>
                        <td>{row.typeLabel || row.typeKey || "—"}</td>
                        <td className="documents-name-cell">
                          <span className="plans-management-desc-preview complaint-description-preview">{row.description || "—"}</span>
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
                        <td>
                          <span className={statusBadgeClass(row.status)} data-testid={`complaints-management-status-${row.id}`}>
                            {complaintStatusOptionLabel(row.status, t)}
                          </span>
                        </td>
                        <td>
                          <div className="plans-actions-cell documents-actions-cell documents-row-icon-actions">
                            {row.attachmentUrl ? (
                              <a
                                className="documents-icon-action documents-icon-action--file"
                                data-testid={`complaints-management-attachment-${row.id}`}
                                href={row.attachmentUrl}
                                rel="noopener noreferrer"
                                target="_blank"
                                aria-label={t("userDetails.complaintAttachment")}
                                title={t("userDetails.complaintAttachment")}
                              >
                                <ExternalLink size={18} />
                              </a>
                            ) : (
                              <span
                                className="documents-icon-action documents-icon-action--file documents-icon-action--disabled"
                                aria-hidden
                                title={t("userDetails.complaintAttachment")}
                              >
                                <ExternalLink size={18} />
                              </span>
                            )}
                            {canEditStatus ? (
                              <button
                                type="button"
                                className="documents-icon-action documents-icon-action--details"
                                data-testid={`complaints-management-edit-${row.id}`}
                                aria-label={t("userDetails.complaintEditTitle")}
                                title={t("userDetails.complaintEditTitle")}
                                disabled={isSelectionMode}
                                onClick={() => setEditingComplaint(row)}
                              >
                                <Pencil size={18} strokeWidth={1.75} aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {!complaintsLoading && !complaintsError && visibleComplaints.length > 0 ? (
          <div className="users-pagination billing-users-pagination documents-pagination-footer">
            <span className="users-pagination-meta" data-testid="complaints-pagination-meta">
              {t("complaintsManagement.paginationMeta", {
                current: safePage,
                total: totalPages,
                count: visibleComplaints.length,
              })}
            </span>
            <div className="billing-pagination-buttons">
              <button type="button" disabled={isSelectionMode || safePage === 1} data-testid="complaints-page-first" onClick={() => goToPage(1)}>
                <ChevronsLeft size={16} aria-hidden />
              </button>
              <button type="button" disabled={isSelectionMode || safePage === 1} data-testid="complaints-page-prev" onClick={() => goToPage(safePage - 1)}>
                <ChevronDown className="rotate-90" size={16} aria-hidden />
              </button>
              {paginationPages.map((page) => (
                <button
                  className={page === safePage ? "is-active" : ""}
                  type="button"
                  key={page}
                  data-testid={`complaints-page-${page}`}
                  disabled={isSelectionMode}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={isSelectionMode || safePage === totalPages}
                data-testid="complaints-page-next"
                onClick={() => goToPage(safePage + 1)}
              >
                <ChevronDown className="rotate-minus-90" size={16} aria-hidden />
              </button>
              <button type="button" disabled={isSelectionMode || safePage === totalPages} data-testid="complaints-page-last" onClick={() => goToPage(totalPages)}>
                <ChevronsRight size={16} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        {editingComplaint ? (
          <ComplaintEditDialog
            complaint={editingComplaint}
            language={language}
            onClose={() => setEditingComplaint(null)}
            onSaved={async () => {
              await reloadComplaintsSilent();
              setEditingComplaint(null);
            }}
            t={t}
            updateComplaintStatusUseCase={updateComplaintStatusUseCase}
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function getPaginationPages(currentPage, totalPages) {
  const delta = 2;
  const pages = new Set([1, totalPages]);
  for (let i = currentPage - delta; i <= currentPage + delta; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function ComplaintsTableShimmerRows({ rowCount }) {
  return Array.from({ length: rowCount }, (_, i) => (
    <tr className="users-shimmer-row" key={`complaints-shimmer-${i}`}>
      <td className="users-checkbox-cell">
        <span className="users-shimmer users-shimmer-checkbox" />
      </td>
      <td className="documents-uploader-cell">
        <div className="documents-uploader-lines documents-uploader-lines--shimmer">
          <span className="users-shimmer users-shimmer-line users-shimmer-line--name" />
          <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
        </div>
      </td>
      <td>
        <span className="users-shimmer users-shimmer-line users-shimmer-line--date" />
      </td>
      <td className="documents-name-cell">
        <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
      </td>
      <td>
        <span className="users-shimmer users-shimmer-line users-shimmer-line--date" />
      </td>
      <td>
        <span className="users-shimmer users-shimmer-pill" />
      </td>
      <td>
        <div className="plans-actions-cell documents-actions-cell documents-row-icon-actions">
          <span className="users-shimmer-actions users-shimmer-actions--documents">
            <span className="users-shimmer users-shimmer-icon" />
            <span className="users-shimmer users-shimmer-icon" />
          </span>
        </div>
      </td>
    </tr>
  ));
}
