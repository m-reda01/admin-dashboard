import React, { useEffect, useMemo, useState } from "react";

const COMPLAINT_STATUS_PRESETS = ["open", "pending", "resolved", "closed", "rejected"];

export function buildComplaintStatusSelectValues(complaint) {
  const current = String(complaint?.status ?? "").trim();
  const lower = current.toLowerCase();
  const out = [];
  const seen = new Set();
  if (current) {
    out.push(current);
    seen.add(lower);
  }
  for (const preset of COMPLAINT_STATUS_PRESETS) {
    if (!seen.has(preset)) {
      out.push(preset);
      seen.add(preset);
    }
  }
  return out;
}

export function complaintStatusOptionLabel(status, t) {
  const key = String(status || "").trim().toLowerCase();
  const translated = t(`userDetails.complaintStatuses.${key}`);
  if (translated !== `userDetails.complaintStatuses.${key}`) return translated;
  return status || "—";
}

export function formatComplaintDate(date, language) {
  if (!date) return "-";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ComplaintEditDialog({ complaint, language, onClose, onSaved, t, updateComplaintStatusUseCase }) {
  const [status, setStatus] = useState(() => String(complaint?.status ?? "").trim() || "open");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStatus(String(complaint?.status ?? "").trim() || "open");
    setSaveError("");
  }, [complaint]);

  const statusValues = useMemo(() => buildComplaintStatusSelectValues(complaint), [complaint]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!updateComplaintStatusUseCase || !complaint?.id) return;
    const nextStatus = status.trim();
    if (!nextStatus) return;

    setSaveError("");
    setIsSaving(true);
    try {
      await updateComplaintStatusUseCase.execute({ complaintId: complaint.id, status: nextStatus });
      await onSaved();
    } catch (e) {
      setSaveError(e?.message || t("userDetails.complaintSaveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="complaint-edit-dialog-title"
        aria-modal="true"
        className="edit-user-dialog complaint-edit-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="edit-user-dialog-header">
          <div>
            <h2 id="complaint-edit-dialog-title">{t("userDetails.complaintEditTitle")}</h2>
            <p>{t("userDetails.complaintEditHint")}</p>
          </div>
        </div>

        <form className="edit-user-form complaint-edit-dialog-form" onSubmit={handleSubmit}>
          <div className="complaint-edit-readonly-scroll">
            <dl className="billing-payment-detail-dl organization-details-card-dl complaint-edit-readonly-section">
              <div>
                <dt>{t("userDetails.complaintType")}</dt>
                <dd>{complaint.typeLabel || complaint.typeKey || "—"}</dd>
              </div>
              <div>
                <dt>{t("userDetails.complaintDescription")}</dt>
                <dd>{complaint.description || "—"}</dd>
              </div>
              <div>
                <dt>{t("usersManagement.email")}</dt>
                <dd>{complaint.userEmail || "—"}</dd>
              </div>
              <div>
                <dt>{t("usersManagement.name")}</dt>
                <dd>{complaint.userDisplayName || "—"}</dd>
              </div>
              <div>
                <dt>{t("userDetails.complaintCreatedShort")}</dt>
                <dd>{formatComplaintDate(complaint.createdAt, language)}</dd>
              </div>
              <div>
                <dt>{t("userDetails.complaintUpdatedShort")}</dt>
                <dd>{formatComplaintDate(complaint.updatedAt, language)}</dd>
              </div>
              {complaint.attachmentUrl ? (
                <div>
                  <dt>{t("userDetails.complaintAttachment")}</dt>
                  <dd>
                    <a href={complaint.attachmentUrl} rel="noopener noreferrer" target="_blank">
                      {t("userDetails.complaintAttachment")}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="complaint-edit-footer">
            <label>
              <span>{t("userDetails.complaintStatus")}</span>
              <select data-testid="complaint-edit-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                {statusValues.map((value) => (
                  <option key={`${complaint.id}-${value}`} value={value}>
                    {complaintStatusOptionLabel(value, t)}
                  </option>
                ))}
              </select>
            </label>

            {saveError ? <p className="app-alert app-alert--error">{saveError}</p> : null}

            <div className="confirm-dialog-actions complaint-edit-actions">
              <button
                type="button"
                className="confirm-dialog-button confirm-dialog-button--neutral"
                data-testid="complaint-edit-cancel"
                onClick={onClose}
              >
                {t("usersManagement.cancel")}
              </button>
              <button
                type="submit"
                className="confirm-dialog-button confirm-dialog-button--primary complaint-edit-save-button"
                data-testid="complaint-edit-submit"
                disabled={isSaving || !status.trim()}
              >
                {isSaving ? t("usersManagement.saving") : t("userDetails.saveComplaintStatus")}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
