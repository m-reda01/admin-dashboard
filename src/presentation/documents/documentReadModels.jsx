import React, { useState } from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import { getDocumentListStatusKey } from "../../domain/documents/documentListStatus.js";

export { getDocumentListStatusKey };

export function getDocumentUploaderUserId(doc) {
  const u = String(doc.uploadedByUserId ?? "").trim();
  if (u) return u;
  return String(doc.createdByUserId ?? doc.userId ?? "").trim();
}

export function isImageDocument(doc) {
  const url = String(doc.fileUrl ?? "").trim().toLowerCase();
  const docType = String(doc.documentType ?? "").trim().toLowerCase();
  const fileType = String(doc.fileType ?? "").trim().toLowerCase();
  if (!url) return false;
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"].some((ext) => url.endsWith(ext))) return true;
  const mimeOrShort = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
  ]);
  return mimeOrShort.has(docType) || mimeOrShort.has(fileType);
}

export function DocumentAvatarThumb({ doc, size = 32 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = String(doc.fileUrl || "").trim();
  const showImg = Boolean(url) && isImageDocument(doc) && !imgFailed;
  const iconSize = Math.max(10, Math.round(size * 0.45));
  const shellStyle = {
    width: size,
    height: size,
    borderRadius: 999,
    flexShrink: 0,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #a7c5ff, #5c8df6)",
    color: "#fff",
  };

  if (showImg) {
    return (
      <span className="documents-doc-avatar" data-testid="documents-avatar-thumb" style={shellStyle}>
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className="users-avatar documents-doc-avatar" data-testid="documents-avatar-icon" style={shellStyle}>
      <FileText size={iconSize} />
    </span>
  );
}

function formatDate(date, language) {
  if (!date) return "-";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function DocumentDetailsModal({ doc, onClose, t, language }) {
  if (!doc) return null;

  const listStatusKey = getDocumentListStatusKey(doc);
  const statusPillClass =
    listStatusKey === "certified"
      ? "activated"
      : listStatusKey === "rejected"
        ? "expired"
        : listStatusKey === "uploaded"
          ? "trial"
          : "pending";

  const fields = [
    { label: t("documentsManagement.details.documentName"), value: doc.title || doc.fileName || "-" },
    { label: t("documentsManagement.details.documentType"), value: doc.documentType || "-" },
    { label: t("documentsManagement.details.description"), value: doc.description || "-" },
    { label: t("documentsManagement.details.fileSize"), value: doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "-" },
    { label: t("documentsManagement.details.issuanceDate"), value: doc.issuanceDate || "-" },
    { label: t("documentsManagement.details.uploadedByName"), value: doc.uploadedByName || "-" },
    { label: t("documentsManagement.details.uploadedByEmail"), value: doc.uploadedByEmail || "-" },
    { label: t("documentsManagement.details.uploadedByRole"), value: doc.uploadedByRole || "-" },
    { label: t("documentsManagement.details.sha256"), value: doc.sha256 || doc.localHash || "-", mono: true },
    { label: t("documentsManagement.details.contractAddress"), value: doc.contractAddress || "-", mono: true },
    { label: t("documentsManagement.details.createdAt"), value: formatDate(doc.createdAt, language) },
    { label: t("documentsManagement.details.updatedAt"), value: formatDate(doc.updatedAt, language) },
  ];

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="doc-details-title"
        aria-modal="true"
        className="doc-details-modal"
        role="dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="doc-details-header">
          <div className="doc-details-header-left">
            <DocumentAvatarThumb doc={doc} size={40} />
            <div>
              <h2 id="doc-details-title">{doc.title || doc.fileName || "-"}</h2>
              <span className={`users-pill users-pill--${statusPillClass}`} style={{ fontSize: 11 }} data-testid={`documents-detail-status-${listStatusKey}`}>
                {t(`documentsManagement.statuses.${listStatusKey}`)}
              </span>
            </div>
          </div>
          <div className="doc-details-header-actions">
            {doc.fileUrl && (
              <a className="doc-details-view-btn" href={doc.fileUrl} target="_blank" rel="noopener noreferrer" title="View File">
                <ExternalLink size={16} />
              </a>
            )}
            <button className="doc-details-close-btn" type="button" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="doc-details-body">
          <dl className="doc-details-grid">
            {fields.map(({ label, value, mono }) => (
              <div className="doc-details-row" key={label}>
                <dt>{label}</dt>
                <dd className={mono ? "doc-details-mono" : ""}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
