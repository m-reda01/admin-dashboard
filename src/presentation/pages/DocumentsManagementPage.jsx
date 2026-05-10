import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  ExternalLink,
  Search,
  Trash2,
} from "lucide-react";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import {
  DocumentAvatarThumb,
  DocumentDetailsModal,
  getDocumentListStatusKey,
  getDocumentUploaderUserId,
} from "../documents/documentReadModels.jsx";

const DOCUMENTS_PAGE_SIZE = 10;

function isDocumentCertified(doc) {
  return getDocumentListStatusKey(doc) === "certified";
}

export function DocumentsManagementPage({
  listDocumentsUseCase,
  deleteDocumentUseCase,
  onNavigate,
  session,
}) {
  const { language, t } = useI18n();
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState("");
  const [pendingDeleteDocs, setPendingDeleteDocs] = useState([]);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      setIsLoading(true);
      setError("");

      try {
        const nextDocs = await listDocumentsUseCase.execute({ pageSize: 50 });
        if (isMounted) setDocuments(nextDocs);
      } catch (loadError) {
        if (isMounted) setError(loadError?.message || t("documentsManagement.loadError"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDocuments();
    return () => { isMounted = false; };
  }, [listDocumentsUseCase, t]);

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      const isCertified = isDocumentCertified(doc);
      const isStatusMatch =
        statusFilter === "all" ||
        (statusFilter === "certified" && isCertified) ||
        (statusFilter === "notCertified" && !isCertified);
      if (!isStatusMatch) return false;
      if (!normalizedQuery) return true;
      return [
        doc.title,
        doc.documentType,
        doc.uploadedByName,
        doc.uploadedByEmail,
        doc.uploadedByUserId,
        doc.createdByUserId,
        doc.userId,
        doc.id,
        doc.contractAddress,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedQuery));
    });
  }, [searchQuery, statusFilter, documents]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleDocuments.length / DOCUMENTS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageDocs = visibleDocuments.slice(
    (safeCurrentPage - 1) * DOCUMENTS_PAGE_SIZE,
    safeCurrentPage * DOCUMENTS_PAGE_SIZE,
  );
  const pageDocIds = useMemo(() => pageDocs.map((d) => d.id), [pageDocs]);
  const selectedVisibleCount = pageDocIds.filter((id) => selectedIds.has(id)).length;
  const isAllVisibleSelected = pageDocIds.length > 0 && selectedVisibleCount === pageDocIds.length;
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;
  const paginationPages = getPaginationPages(safeCurrentPage, totalPages);
  const selectedDocs = useMemo(() => documents.filter((d) => selectedIds.has(d.id)), [selectedIds, documents]);
  const isSelectionMode = selectedDocs.length > 0;

  function handleSelectAllVisible(event) {
    const shouldSelect = event.target.checked;
    setSelectedIds((cur) => {
      const next = new Set(cur);
      pageDocIds.forEach((id) => (shouldSelect ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function handleSelectDoc(id, shouldSelect) {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      shouldSelect ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function goToPage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────
  function handleDeleteDoc(doc) {
    setPendingDeleteDocs([doc]);
  }

  async function confirmDeleteDocs() {
    if (pendingDeleteDocs.length === 0) return;
    const docsToDelete = pendingDeleteDocs;
    setAlert(null);
    setDeletingId(docsToDelete[0].id);

    try {
      for (const d of docsToDelete) {
        setDeletingId(d.id);
        await deleteDocumentUseCase.execute({ documentId: d.id });
      }
      const deletedIds = docsToDelete.map((d) => d.id);
      const deletedSet = new Set(deletedIds);
      setDocuments((cur) => cur.filter((item) => !deletedSet.has(item.id)));
      setSelectedIds((cur) => {
        const next = new Set(cur);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      setAlert({ message: t("documentsManagement.deleteSuccess"), variant: "success" });
    } catch {
      setAlert({ message: t("documentsManagement.loadError"), variant: "error" });
    } finally {
      setDeletingId("");
      setPendingDeleteDocs([]);
    }
  }

  return (
    <DashboardLayout activePage="documents" onNavigate={onNavigate} session={session} title={t("documentsManagement.title")}>
      <div className="users-management-page plans-management-page documents-management-page">
        <div className="users-toolbar">
          <AppAlert message={alert?.message} variant={alert?.variant} onClose={() => setAlert(null)} />
          <div className="users-toolbar-actions">
            <label className="users-search">
              <Search size={18} />
              <input
                type="search"
                disabled={isSelectionMode}
                placeholder={t("documentsManagement.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <label className="users-filter-select">
              <select value={statusFilter} disabled={isSelectionMode} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">{t("documentsManagement.allStatuses")}</option>
                <option value="certified">{t("documentsManagement.certified")}</option>
                <option value="notCertified">{t("documentsManagement.notCertified")}</option>
              </select>
              <ChevronDown size={16} />
            </label>
            {isSelectionMode && (
              <button
                className="users-bulk-delete-button"
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setPendingDeleteDocs(selectedDocs)}
              >
                <Trash2 size={16} />
                {t("documentsManagement.deleteSelected", { count: selectedDocs.length })}
              </button>
            )}
          </div>
        </div>

        <div className="users-table-shell plans-table-shell">
          <div className="users-table-scroll plans-table-scroll">
            <table className="plans-table documents-table" data-testid="documents-table">
              <thead>
                <tr>
                  <th className="users-checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={t("documentsManagement.selectAll")}
                      checked={isAllVisibleSelected}
                      data-testid="documents-select-all"
                      disabled={pageDocs.length === 0 || isLoading}
                      ref={(el) => { if (el) el.indeterminate = isSomeVisibleSelected; }}
                      onChange={handleSelectAllVisible}
                    />
                  </th>
                  <th>{t("documentsManagement.titleCol")}</th>
                  <th>{t("documentsManagement.uploadedBy")}</th>
                  <th>{t("documentsManagement.issuanceDate")}</th>
                  <th>{t("documentsManagement.status")}</th>
                  <th>{t("documentsManagement.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <TableShimmerRows />}

                {!isLoading && error && (
                  <tr><td className="plans-empty-cell plans-empty-cell--error" colSpan={6}>{error}</td></tr>
                )}

                {!isLoading && !error && visibleDocuments.length === 0 && (
                  <tr><td className="plans-empty-cell" colSpan={6}>{t("documentsManagement.empty")}</td></tr>
                )}

                {!isLoading && !error && pageDocs.map((doc) => {
                  const title = doc.title || doc.fileName || "-";
                  const docType = doc.documentType || "-";
                  const uploader = doc.uploadedByName || doc.certifiedByName || "-";
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
                    <tr className={selectedIds.has(doc.id) ? "is-selected" : ""} key={doc.id}>
                      <td className="users-checkbox-cell">
                        <input
                          type="checkbox"
                          aria-label={`${t("documentsManagement.selectDocument")} ${title}`}
                          checked={selectedIds.has(doc.id)}
                          onChange={(e) => handleSelectDoc(doc.id, e.target.checked)}
                        />
                      </td>
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
                              data-testid="documents-uploader-link"
                              disabled={isSelectionMode}
                              onClick={() => onNavigate(`/users/${encodeURIComponent(uploaderUserId)}`)}
                            >
                              {uploader}
                            </button>
                          ) : (
                            <span className="documents-uploader-name">{uploader}</span>
                          )}
                          <span className="documents-uploader-meta">{uploaderSecondLine || "\u2014"}</span>
                        </div>
                      </td>
                      <td>{doc.issuanceDate ? formatDateStr(doc.issuanceDate, language) : formatDate(doc.createdAt, language)}</td>
                      <td>
                        <span className={statusBadgeClass} data-testid={`documents-status-${listStatusKey}`}>
                          {t(`documentsManagement.statuses.${listStatusKey}`)}
                        </span>
                      </td>
                      <td>
                        <div className="plans-actions-cell documents-actions-cell documents-row-icon-actions">
                          {fileUrl ? (
                            <a
                              className="documents-icon-action documents-icon-action--file"
                              data-testid="documents-action-view-file"
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
                              data-testid="documents-action-view-file-disabled"
                              aria-label={t("documentsManagement.viewFile")}
                              title={t("documentsManagement.noFileUrl")}
                            >
                              <ExternalLink size={18} />
                            </span>
                          )}
                          <button
                            type="button"
                            className="documents-icon-action documents-icon-action--details"
                            data-testid="documents-action-details"
                            aria-label={t("documentsManagement.viewDetails")}
                            title={t("documentsManagement.viewDetails")}
                            disabled={isSelectionMode}
                            onClick={() => setViewingDoc(doc)}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            className="documents-icon-action documents-icon-action--danger"
                            data-testid="documents-action-delete"
                            aria-label={t("documentsManagement.delete")}
                            title={t("documentsManagement.delete")}
                            disabled={isSelectionMode}
                            onClick={() => handleDeleteDoc(doc)}
                          >
                            <Trash2 size={18} />
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

        {!isLoading && !error && visibleDocuments.length > 0 && (
          <div className="users-pagination billing-users-pagination documents-pagination-footer">
            <span className="users-pagination-meta" data-testid="documents-pagination-meta">
              {t("documentsManagement.paginationMeta", {
                current: safeCurrentPage,
                total: totalPages,
                count: visibleDocuments.length,
              })}
            </span>
            <div className="billing-pagination-buttons">
              <button type="button" disabled={isSelectionMode || safeCurrentPage === 1} data-testid="documents-page-first" onClick={() => goToPage(1)}><ChevronsLeft size={16} /></button>
              <button type="button" disabled={isSelectionMode || safeCurrentPage === 1} data-testid="documents-page-prev" onClick={() => goToPage(safeCurrentPage - 1)}><ChevronDown className="rotate-90" size={16} /></button>
              {paginationPages.map((page) => (
                <button
                  className={page === safeCurrentPage ? "is-active" : ""}
                  type="button"
                  key={page}
                  data-testid={`documents-page-${page}`}
                  disabled={isSelectionMode}
                  onClick={() => goToPage(page)}
                >{page}</button>
              ))}
              <button type="button" disabled={isSelectionMode || safeCurrentPage === totalPages} data-testid="documents-page-next" onClick={() => goToPage(safeCurrentPage + 1)}><ChevronDown className="rotate-minus-90" size={16} /></button>
              <button type="button" disabled={isSelectionMode || safeCurrentPage === totalPages} data-testid="documents-page-last" onClick={() => goToPage(totalPages)}><ChevronsRight size={16} /></button>
            </div>
          </div>
        )}

        {/* ── Delete Dialog ── */}
        <DeleteDialog
          isDeleting={Boolean(deletingId)}
          onCancel={() => setPendingDeleteDocs([])}
          onConfirm={confirmDeleteDocs}
          t={t}
          docs={pendingDeleteDocs}
        />

        {/* ── Details Modal ── */}
        <DocumentDetailsModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          t={t}
          language={language}
        />
      </div>
    </DashboardLayout>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPaginationPages(currentPage, totalPages) {
  const delta = 2;
  const pages = new Set([1, totalPages]);
  for (let i = currentPage - delta; i <= currentPage + delta; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function formatDate(date, language) {
  if (!date) return "-";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDateStr(str, language) {
  if (!str) return "-";
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(str));
  } catch { return str; }
}

function TableShimmerRows() {
  return Array.from({ length: DOCUMENTS_PAGE_SIZE }, (_, i) => (
    <tr className="users-shimmer-row" key={`shimmer-${i}`}>
      <td className="users-checkbox-cell"><span className="users-shimmer users-shimmer-checkbox" /></td>
      <td>
        <div className="users-shimmer-name">
          <span className="users-shimmer users-shimmer-avatar" />
          <span className="users-shimmer-lines">
            <span className="users-shimmer users-shimmer-line users-shimmer-line--name" />
            <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
          </span>
        </div>
      </td>
      <td className="documents-uploader-cell">
        <div className="documents-uploader-lines documents-uploader-lines--shimmer">
          <span className="users-shimmer users-shimmer-line users-shimmer-line--name" />
          <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
        </div>
      </td>
      <td><span className="users-shimmer users-shimmer-line users-shimmer-line--date" /></td>
      <td><span className="users-shimmer users-shimmer-pill" /></td>
      <td>
        <div className="plans-actions-cell documents-actions-cell documents-row-icon-actions">
          <span className="users-shimmer-actions users-shimmer-actions--documents">
            <span className="users-shimmer users-shimmer-icon" />
            <span className="users-shimmer users-shimmer-icon" />
            <span className="users-shimmer users-shimmer-icon" />
          </span>
        </div>
      </td>
    </tr>
  ));
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────
function DeleteDialog({ isDeleting, onCancel, onConfirm, t, docs }) {
  if (!docs.length) return null;
  const isBulkDelete = docs.length > 1;
  const title = isBulkDelete ? "" : (docs[0].title || docs[0].fileName || "-");

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        aria-labelledby="delete-doc-dialog-title"
        aria-modal="true"
        className="confirm-dialog"
        role="dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-icon"><Trash2 size={22} /></span>
          <div>
            <h2 id="delete-doc-dialog-title">
              {isBulkDelete ? t("documentsManagement.deleteSelected", { count: docs.length }) : t("documentsManagement.deleteDialogTitle")}
            </h2>
            <p>{isBulkDelete ? t("documentsManagement.deleteSelected", { count: docs.length }) : t("documentsManagement.deleteDialogDescription", { title })}</p>
          </div>
        </div>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-button confirm-dialog-button--neutral" type="button" onClick={onCancel}>
            {t("documentsManagement.cancel")}
          </button>
          <button className="confirm-dialog-button confirm-dialog-button--danger" type="button" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? t("documentsManagement.deleting") : t("documentsManagement.confirmDelete")}
          </button>
        </div>
      </section>
    </div>
  );
}

