import React, { useEffect } from "react";
import html2pdf from "html2pdf.js";

export function isOrganizationPayment(payment) {
  const orgId = String(payment?.orgId || "").trim();
  if (orgId) return true;
  const purpose = String(payment?.purpose || "").toLowerCase();
  if (purpose === "organization_subscription") return true;
  return String(payment?.description || "").includes("Organization subscription");
}

export function formatBillingPaymentDate(date, language) {
  if (!date) return "-";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date instanceof Date ? date : new Date(date));
}

export function formatBillingCurrency(amount, currency = "SAR", language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency: currency || "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatPurpose(purpose) {
  if (!purpose) return "-";
  return purpose.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatMethod(method) {
  if (!method) return "-";
  const value = String(method).toLowerCase();
  if (value.includes("card")) return "Card";
  return method.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined) return null;
  const display = String(value).trim();
  if (!display) return null;

  return (
    <div>
      <dt>{label}</dt>
      <dd>{display}</dd>
    </div>
  );
}

export function PaymentDetailsDialog({ language, onClose, onOpenSubscriber, payment, t }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const organizationPayment = isOrganizationPayment(payment);
  const hasUser = Boolean(String(payment.userId || "").trim());
  const hasOrg = Boolean(String(payment.orgId || "").trim());

  return (
    <div
      className="confirm-dialog-backdrop billing-payment-detail-backdrop"
      role="presentation"
      data-testid="billing-payment-detail-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="confirm-dialog billing-payment-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-payment-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="billing-payment-detail-header">
          <h2 id="billing-payment-detail-title">{t("billing.detailDialogTitle")}</h2>
          <button
            type="button"
            className="billing-payment-detail-close"
            data-testid="billing-payment-detail-close"
            aria-label={t("billing.closeDetails")}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <dl className="billing-payment-detail-dl">
          <DetailRow label={t("billing.detailLabels.paymentId")} value={payment.paymentId} />
          <DetailRow label={t("billing.detailLabels.description")} value={payment.description} />
          {payment.purpose ? (
            <DetailRow label={t("billing.detailLabels.purpose")} value={formatPurpose(payment.purpose)} />
          ) : null}
          <DetailRow
            label={t("billing.detailLabels.amount")}
            value={formatBillingCurrency(payment.amount, payment.currency, language)}
          />
          {payment.method ? (
            <DetailRow label={t("billing.detailLabels.method")} value={formatMethod(payment.method)} />
          ) : null}
          <DetailRow
            label={t("billing.detailLabels.status")}
            value={t(`billing.statuses.${payment.status}`) || payment.status}
          />
          <DetailRow label={t("billing.detailLabels.cardBrand")} value={payment.cardBrand} />
          <DetailRow label={t("billing.detailLabels.maskedCardNumber")} value={payment.maskedCardNumber} />
          <DetailRow label={t("billing.detailLabels.invoiceId")} value={payment.invoiceId} />
          <DetailRow label={t("billing.detailLabels.providerCreatedAt")} value={payment.providerCreatedAt} />
          <DetailRow
            label={t("billing.detailLabels.createdAt")}
            value={formatBillingPaymentDate(payment.createdAt, language)}
          />
        </dl>

        <div className="billing-payment-detail-footer">
          <button
            type="button"
            className="confirm-dialog-button confirm-dialog-button--neutral"
            data-testid="billing-payment-detail-dismiss"
            onClick={onClose}
          >
            {t("billing.closeDetails")}
          </button>
          <button
            type="button"
            className="confirm-dialog-button confirm-dialog-button--primary"
            data-testid="billing-payment-detail-subscriber"
            disabled={!hasUser && !hasOrg}
            onClick={onOpenSubscriber}
          >
            {organizationPayment
              ? t("billing.openOrganizationFromDetail")
              : t("billing.openIndividualFromDetail")}
          </button>
        </div>
      </div>
    </div>
  );
}

function paymentDocumentFilename(payment) {
  const raw = String(payment.paymentId || "").trim() || String(payment.id || "payment").trim();
  const safe = raw.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
  return `${safe || "payment"}.pdf`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPaymentDocumentRoot(payment, language, t) {
  const headerCellStyle =
    "text-align:start;border-bottom:1px solid #e8edf2;padding:11px 14px;background:#f6f8fb;color:#3d4f5f;font-size:11px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;width:34%";
  const valueCellStyle =
    "text-align:start;border-bottom:1px solid #e8edf2;padding:11px 14px;color:#1a2332;font-size:13px;vertical-align:top;word-break:break-word";
  const rows = [];

  const pushRow = (label, value) => {
    if (value === null || value === undefined) return;
    const display = String(value).trim();
    if (!display || display === "-") return;
    rows.push(
      `<tr><th style="${headerCellStyle}">${escapeHtml(label)}</th><td style="${valueCellStyle}">${escapeHtml(display)}</td></tr>`,
    );
  };

  pushRow(t("billing.detailLabels.paymentId"), payment.paymentId || payment.id);
  pushRow(t("billing.detailLabels.description"), payment.description);
  if (payment.purpose) pushRow(t("billing.detailLabels.purpose"), formatPurpose(payment.purpose));
  pushRow(t("billing.detailLabels.amount"), formatBillingCurrency(payment.amount, payment.currency, language));
  if (payment.method) pushRow(t("billing.detailLabels.method"), formatMethod(payment.method));
  pushRow(t("billing.detailLabels.status"), t(`billing.statuses.${payment.status}`) || payment.status);
  pushRow(t("billing.detailLabels.cardBrand"), payment.cardBrand);
  pushRow(t("billing.detailLabels.maskedCardNumber"), payment.maskedCardNumber);
  pushRow(t("billing.detailLabels.invoiceId"), payment.invoiceId);
  pushRow(t("billing.detailLabels.providerCreatedAt"), payment.providerCreatedAt);
  pushRow(t("billing.detailLabels.createdAt"), formatBillingPaymentDate(payment.createdAt, language));

  const tableBody = rows.length
    ? rows.join("")
    : `<tr><td colspan="2" style="${valueCellStyle}">${escapeHtml(t("billing.pdfEmptyFallback"))}</td></tr>`;

  const container = document.createElement("div");
  container.dir = language === "ar" ? "rtl" : "ltr";
  container.setAttribute("data-billing-pdf-root", "true");
  container.style.boxSizing = "border-box";
  container.style.width = "720px";
  container.style.minHeight = "120px";
  container.style.padding = "0";
  container.style.background = "#ffffff";
  container.style.color = "#1a2332";
  container.style.fontFamily = 'system-ui, "Segoe UI", "Tahoma", sans-serif';
  container.style.fontSize = "13px";
  container.style.lineHeight = "1.5";
  container.style.borderRadius = "14px";
  container.style.overflow = "hidden";
  container.style.boxShadow = "0 12px 40px rgba(15, 23, 42, 0.12)";
  container.style.border = "1px solid #e2e8f0";

  const dateLabel = escapeHtml(formatBillingPaymentDate(payment.createdAt, language));
  const titleLabel = escapeHtml(t("billing.pdfDocumentTitle"));
  const paymentLabel = escapeHtml(String(payment.paymentId || payment.id || "-"));

  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 55%,#3b82f6 100%);color:#fff;padding:20px 22px 18px">
      <div style="font-size:11px;letter-spacing:0.06em;opacity:0.92;text-transform:uppercase">${titleLabel}</div>
      <div style="font-size:20px;font-weight:800;margin-top:6px;line-height:1.25">${paymentLabel}</div>
      <div style="font-size:12px;margin-top:8px;opacity:0.9">${dateLabel}</div>
    </div>
    <div style="padding:4px 0 8px">
      <table style="border-collapse:collapse;width:100%;table-layout:fixed">
        <tbody>${tableBody}</tbody>
      </table>
    </div>
    <div style="padding:12px 18px 16px;border-top:1px solid #e8edf2;font-size:11px;color:#64748b;background:#fafbfc">
      ${escapeHtml(t("billing.pdfFooter"))}
    </div>
  `;

  return container;
}

export async function downloadPaymentPdf(payment, language, t) {
  const container = buildPaymentDocumentRoot(payment, language, t);
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.zIndex = "2147483000";
  container.style.opacity = "1";
  container.style.pointerEvents = "none";
  container.style.transform = "translate3d(-780px, 0, 0)";
  document.body.appendChild(container);

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const opt = {
    margin: [12, 12, 12, 12],
    filename: paymentDocumentFilename(payment),
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 800,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

export function printPaymentPdf(payment, language, t) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    document.body.removeChild(iframe);
    return;
  }

  const content = buildPaymentDocumentRoot(payment, language, t);
  content.style.boxShadow = "none";
  content.style.border = "0";
  content.style.width = "100%";

  frameDocument.open();
  frameDocument.write(`
    <!doctype html>
    <html dir="${language === "ar" ? "rtl" : "ltr"}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t("billing.pdfDocumentTitle"))}</title>
        <style>
          body { margin: 24px; background: #fff; }
        </style>
      </head>
      <body></body>
    </html>
  `);
  frameDocument.close();
  frameDocument.body.appendChild(content);

  setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 300);
  }, 120);
}
