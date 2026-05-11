import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Download,
  Eye,
  FileX,
  Printer,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  downloadPaymentPdf,
  formatBillingCurrency,
  formatBillingPaymentDate,
  formatMethod,
  formatPurpose,
  PaymentDetailsDialog,
  printPaymentPdf,
} from "../payments/billingPaymentUi.jsx";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { ManagementIndexLayout } from "../layouts/ManagementIndexLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { getPaginationPages } from "../utils/pagination.js";

const PAGE_SIZE = 10;

export function BillingPage({ getUserProfileUseCase, listPaymentsUseCase, onNavigate, session }) {
  const { language, t } = useI18n();
  const [payments, setPayments] = useState([]);
  const [subscriberMap, setSubscriberMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailPayment, setDetailPayment] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reloadPayments = useCallback(async () => {
    const rows = await listPaymentsUseCase.execute({ pageSize: 200 });
    setPayments(rows);
    return rows;
  }, [listPaymentsUseCase]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        await reloadPayments();
      } catch (loadError) {
        if (isMounted) setError(loadError?.message || t("billing.loadError"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [reloadPayments, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadSubscribers() {
      const userIds = Array.from(
        new Set(
          payments
            .map((payment) => String(payment.userId || "").trim())
            .filter(Boolean),
        ),
      );

      if (!userIds.length) {
        setSubscriberMap({});
        return;
      }

      const entries = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const profile = await getUserProfileUseCase.execute({ userId });
            const user = profile?.user || {};
            return [
              userId,
              {
                displayName: user.displayName?.trim() || user.email || userId,
                email: user.email || "",
              },
            ];
          } catch {
            return [
              userId,
              {
                displayName: userId,
                email: "",
              },
            ];
          }
        }),
      );

      if (!cancelled) {
        setSubscriberMap(Object.fromEntries(entries));
      }
    }

    void loadSubscribers();
    return () => {
      cancelled = true;
    };
  }, [getUserProfileUseCase, payments]);

  const stats = useMemo(() => {
    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const cancelledPayments = payments.filter((payment) =>
      ["cancelled", "failed", "refunded"].includes(payment.status),
    );
    return {
      currency: payments[0]?.currency || "SAR",
      totalRevenue: paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
      cancelledAmount: cancelledPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
      totalTransactions: payments.length,
      paidCount: paidPayments.length,
      cancelledCount: cancelledPayments.length,
    };
  }, [payments]);

  const visiblePayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return payments.filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;
      if (!query) return true;

      const subscriber = subscriberMap[payment.userId] || {};

      return [
        payment.paymentId,
        payment.invoiceId,
        payment.description,
        payment.purpose,
        payment.cardBrand,
        payment.maskedCardNumber,
        subscriber.displayName,
        subscriber.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [payments, searchQuery, statusFilter, subscriberMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visiblePayments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagePayments = visiblePayments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const paginationPages = getPaginationPages(safePage, totalPages);

  function goToPage(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handleExportExcel() {
    const headers = [
      t("billing.cols.paymentId"),
      t("billing.cols.date"),
      t("billing.cols.description"),
      t("billing.cols.subscriber"),
      t("billing.cols.method"),
      t("billing.cols.amount"),
      t("billing.cols.status"),
    ];
    const body = visiblePayments.map((payment) => {
      const subscriber = getPaymentSubscriber(payment, subscriberMap, t);
      return [
        payment.paymentId || payment.invoiceId || payment.id,
        formatBillingPaymentDate(payment.createdAt, language),
        payment.description || formatPurpose(payment.purpose),
        subscriber.displayName,
        formatCardMethod(payment),
        Number(payment.amount) || 0,
        t(`billing.statuses.${payment.status}`) || payment.status || "",
      ];
    });
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
    worksheet["!cols"] = [
      { wch: 24 },
      { wch: 22 },
      { wch: 36 },
      { wch: 28 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("billing.exportSheetName"));
    XLSX.writeFile(workbook, `payments-${Date.now()}.xlsx`);
  }

  return (
    <DashboardLayout activePage="billing" onNavigate={onNavigate} session={session} title={t("billing.title")}>
      <ManagementIndexLayout
        className="plans-management-page billing-payments-page billing-page"
        beforeToolbar={
          <div className="billing-stats-grid">
            <BillingStatCard
              icon={<CreditCard size={16} />}
              iconClassName="billing-stat-icon billing-stat-icon--green"
              isLoading={isLoading}
              label={t("billing.totalRevenue")}
              sublabel={isLoading ? "" : t("billing.completedTransactions", { count: stats.paidCount })}
              value={formatBillingCurrency(stats.totalRevenue, stats.currency, language)}
            />
            <BillingStatCard
              icon={<FileX size={16} />}
              iconClassName="billing-stat-icon billing-stat-icon--red"
              isLoading={isLoading}
              label={t("billing.cancelledPayment")}
              sublabel={isLoading ? "" : t("billing.cancelledTransactions", { count: stats.cancelledCount })}
              value={formatBillingCurrency(stats.cancelledAmount, stats.currency, language)}
            />
            <BillingStatCard
              icon={<RefreshCw size={16} />}
              iconClassName="billing-stat-icon billing-stat-icon--orange"
              isLoading={isLoading}
              label={t("billing.numberOfTransactions")}
              sublabel={t("billing.allTransactions")}
              value={String(stats.totalTransactions)}
            />
          </div>
        }
        toolbarAlert={<AppAlert message={alert?.message} variant={alert?.variant} onClose={() => setAlert(null)} />}
        toolbarActions={
          <>
            <label className="users-search">
              <Search size={18} />
              <input
                type="search"
                placeholder={t("billing.search")}
                value={searchQuery}
                data-testid="billing-payments-search"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>

            <label className="users-filter-select">
              <select
                value={statusFilter}
                data-testid="billing-status-filter"
                onChange={(event) => setStatusFilter(event.target.value)}
              >
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
              data-testid="billing-export-xlsx"
              disabled={visiblePayments.length === 0}
              aria-label={t("billing.exportExcel")}
              onClick={handleExportExcel}
            >
              <Download size={18} aria-hidden />
            </button>
          </>
        }
      >
        <div className="users-table-shell plans-table-shell billing-payments-table-shell">
          <div className="users-table-scroll plans-table-scroll">
            <table className="plans-table payments-table billing-payments-table" data-testid="billing-payments-table">
              <thead>
                <tr>
                  <th>{t("billing.cols.summary")}</th>
                  <th>{t("billing.cols.subscriber")}</th>
                  <th>{t("billing.cols.method")}</th>
                  <th>{t("billing.cols.amount")}</th>
                  <th>{t("billing.cols.status")}</th>
                  <th>{t("billing.cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <BillingPaymentsTableShimmerRows rowCount={PAGE_SIZE} />}

                {!isLoading && error && (
                  <tr>
                    <td colSpan={6} className="plans-empty-cell plans-empty-cell--error">
                      {error}
                    </td>
                  </tr>
                )}

                {!isLoading && !error && visiblePayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="plans-empty-cell">
                      {t("billing.empty")}
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  !error &&
                  pagePayments.map((payment) => {
                    const subscriber = getPaymentSubscriber(payment, subscriberMap, t);
                    return (
                      <tr key={payment.id} data-testid={`billing-payment-row-${payment.id}`}>
                        <td>
                          <button
                            type="button"
                            className="billing-payment-id-button"
                            onClick={() => setDetailPayment(payment)}
                          >
                            <span className="billing-payment-id">
                              {payment.invoiceId || payment.paymentId || shortId(payment.id)}
                            </span>
                          </button>
                          <span className="billing-payment-summary-date">
                            {formatBillingPaymentDate(payment.createdAt, language)}
                          </span>
                          <div className="billing-payment-summary-desc">
                            {payment.description || formatPurpose(payment.purpose)}
                          </div>
                        </td>

                        <td>
                          <div className="billing-subscriber-cell">
                            <span className="billing-subscriber-avatar" aria-hidden>
                              <UserRound size={14} />
                            </span>
                            <span className="billing-subscriber-copy">
                              <strong>{subscriber.displayName}</strong>
                              <small>{subscriber.email || subscriber.typeLabel}</small>
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="billing-method-cell">
                            <strong>{formatCardMethod(payment)}</strong>
                            <small>{formatPurpose(payment.purpose)}</small>
                          </div>
                        </td>

                        <td className="plans-table-price">
                          {formatBillingCurrency(payment.amount, payment.currency, language)}
                        </td>

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
                              aria-label={t("billing.downloadPdf")}
                              data-testid={`billing-download-${payment.id}`}
                              onClick={() => void downloadPaymentPdf(payment, language, t)}
                            >
                              <Download size={18} strokeWidth={1.75} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="plans-action-edit"
                              aria-label={t("billing.printInvoice")}
                              data-testid={`billing-print-${payment.id}`}
                              onClick={() => printPaymentPdf(payment, language, t)}
                            >
                              <Printer size={18} strokeWidth={1.75} aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="plans-action-edit"
                              aria-label={t("billing.openDetails")}
                              data-testid={`billing-details-${payment.id}`}
                              onClick={() => setDetailPayment(payment)}
                            >
                              <Eye size={18} strokeWidth={1.75} aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {!isLoading && !error && visiblePayments.length > 0 ? (
            <div className="users-pagination billing-users-pagination">
              <span className="users-pagination-meta" data-testid="billing-pagination-meta">
                {t("billing.paginationMeta", {
                  current: safePage,
                  total: totalPages,
                  count: visiblePayments.length,
                })}
              </span>

              <div className="billing-pagination-buttons">
                <button type="button" disabled={safePage === 1} onClick={() => goToPage(1)}>
                  <ChevronsLeft size={16} />
                </button>
                <button type="button" disabled={safePage === 1} onClick={() => goToPage(safePage - 1)}>
                  <ChevronDown className="rotate-90" size={16} />
                </button>
                {paginationPages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={page === safePage ? "is-active" : ""}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button type="button" disabled={safePage === totalPages} onClick={() => goToPage(safePage + 1)}>
                  <ChevronDown className="rotate-minus-90" size={16} />
                </button>
                <button type="button" disabled={safePage === totalPages} onClick={() => goToPage(totalPages)}>
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {detailPayment ? (
          <PaymentDetailsDialog
            language={language}
            payment={detailPayment}
            t={t}
            onClose={() => setDetailPayment(null)}
            onOpenSubscriber={() => {
              const payment = detailPayment;
              setDetailPayment(null);
              openPaymentSubscriber(payment, onNavigate);
            }}
          />
        ) : null}
      </ManagementIndexLayout>
    </DashboardLayout>
  );
}

function BillingStatCard({ icon, iconClassName, isLoading, label, sublabel, value }) {
  return (
    <div className="billing-stat-card">
      <div className={iconClassName}>{icon}</div>
      <div className="billing-stat-body">
        <p className="billing-stat-label">{label}</p>
        {isLoading ? <div className="billing-stat-shimmer" /> : <p className="billing-stat-value">{value}</p>}
        <p className="billing-stat-sub">{sublabel}</p>
      </div>
    </div>
  );
}

function BillingPaymentsTableShimmerRows({ rowCount }) {
  return Array.from({ length: rowCount }, (_, index) => (
    <tr className="users-shimmer-row" key={`billing-payments-shimmer-${index}`}>
      <td>
        <div className="users-shimmer-lines">
          <span className="users-shimmer users-shimmer-line users-shimmer-line--date" />
          <span className="users-shimmer users-shimmer-line users-shimmer-line--email" />
        </div>
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
      <td>
        <div className="users-shimmer-lines">
          <span className="users-shimmer users-shimmer-line users-shimmer-line--role" />
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
        </span>
      </td>
    </tr>
  ));
}

function getPaymentSubscriber(payment, subscriberMap, t) {
  const subscriber = subscriberMap[payment.userId] || null;
  return {
    displayName: subscriber?.displayName || payment.userId || payment.orgId || "-",
    email: subscriber?.email || "",
    typeLabel: payment.orgId ? t("dashboard.nav.organizations") : t("dashboard.nav.users"),
  };
}

function formatCardMethod(payment) {
  const brand = String(payment.cardBrand || "").trim();
  const masked = String(payment.maskedCardNumber || "").trim();
  if (brand && masked) return `${brand.toUpperCase()} · ${masked}`;
  if (brand) return brand.toUpperCase();
  if (masked) return masked;
  return formatMethod(payment.method);
}

function openPaymentSubscriber(payment, onNavigate) {
  const orgId = String(payment.orgId || "").trim();
  const userId = String(payment.userId || "").trim();
  if (orgId) {
    onNavigate(`/organizations/${encodeURIComponent(orgId)}`);
    return;
  }
  if (userId) {
    onNavigate(`/users/${encodeURIComponent(userId)}`);
  }
}

function shortId(id) {
  if (!id) return "-";
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}
