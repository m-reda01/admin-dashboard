import React, { useMemo } from "react";
import { CircleUserRound, CreditCard, FileText, ShieldCheck } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBillingCurrency } from "../payments/billingPaymentUi.jsx";

function shortDayLabel(dayKey, language) {
  if (!dayKey || typeof dayKey !== "string") return "";
  const parts = dayKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dayKey;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(dt);
}

function splitSeriesTrend(series, windowDays = 7) {
  if (!series?.length) return null;
  const n = series.length;
  const w = Math.min(windowDays, Math.max(1, Math.floor(n / 2)));
  if (n < w * 2) return null;
  const recent = series.slice(-w).reduce((s, x) => s + (Number(x.value) || 0), 0);
  const prev = series.slice(-w * 2, -w).reduce((s, x) => s + (Number(x.value) || 0), 0);
  if (prev <= 0 && recent <= 0) return null;
  if (prev <= 0) return { kind: "new" };
  const pct = ((recent - prev) / prev) * 100;
  return { kind: "delta", pct: Math.abs(pct).toFixed(2), up: pct >= 0 };
}

function TimelineRangeSelect({ testId, timelineDays, onTimelineDaysChange, t }) {
  return (
    <select
      className="dash-ref-chip-select"
      value={String(timelineDays)}
      onChange={(e) => onTimelineDaysChange(Number(e.target.value))}
      aria-label={t("dashboard.reference.dateRange")}
      data-testid={testId}
    >
      <option value={7}>{t("dashboard.reference.range7")}</option>
      <option value={30}>{t("dashboard.reference.range30")}</option>
      <option value={90}>{t("dashboard.reference.range90")}</option>
    </select>
  );
}

function TrendPill({ trend, t }) {
  if (!trend) {
    return (
      <span className="dash-ref-pill dash-ref-pill--flat" data-testid="dashboard-ref-trend-flat">
        —
      </span>
    );
  }
  if (trend.kind === "new") {
    return (
      <span className="dash-ref-pill dash-ref-pill--up" data-testid="dashboard-ref-trend-new">
        {t("dashboard.reference.trendNew")}
      </span>
    );
  }
  const cls = trend.up ? "dash-ref-pill dash-ref-pill--up" : "dash-ref-pill dash-ref-pill--down";
  return (
    <span className={cls} data-testid="dashboard-ref-trend-delta">
      {trend.up ? "+" : "−"}
      {trend.pct}% {t("dashboard.reference.vsPriorPeriod")}
    </span>
  );
}

export function DashboardReferenceLayout({
  chartModels,
  chartTheme,
  data,
  language,
  onNavigate,
  onTimelineDaysChange = () => {},
  t,
  timelineDays = 30,
}) {
  const nf = useMemo(
    () => new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }),
    [language],
  );

  const agg = data?.aggregateCounts ?? {};
  const pipeline = data?.documentPipelineSample?.counts ?? {};
  const sampleSize = data?.documentPipelineSample?.sampleSize || 1;
  const certified = Number(pipeline.certified) || 0;
  const healthPct = Math.min(100, Math.max(0, Math.round((certified / Math.max(sampleSize, 1)) * 100)));

  const paidCount =
    typeof data?.paymentsSampleMeta?.paidCountWindow === "number"
      ? data.paymentsSampleMeta.paidCountWindow
      : typeof agg.paymentsByStatus?.paid === "number"
        ? agg.paymentsByStatus.paid
        : 0;
  const paidVol = typeof data?.paymentsSampleMeta?.paidVolumeSample === "number" ? data.paymentsSampleMeta.paidVolumeSample : 0;

  const txTrend = splitSeriesTrend(chartModels?.paymentsCountSeries);
  const amtTrend = splitSeriesTrend(chartModels?.paymentsPaidAmountSeries);

  const chartMerged = useMemo(() => {
    const a = chartModels?.paymentsCountSeries ?? [];
    const b = chartModels?.paymentsPaidAmountSeries ?? [];
    const map = new Map();
    for (const row of a) {
      map.set(row.dayKey, { dayKey: row.dayKey, tx: row.value, sar: 0 });
    }
    for (const row of b) {
      const cur = map.get(row.dayKey) || { dayKey: row.dayKey, tx: 0, sar: 0 };
      cur.sar = row.value;
      map.set(row.dayKey, cur);
    }
    return [...map.values()].sort((x, y) => String(x.dayKey).localeCompare(String(y.dayKey)));
  }, [chartModels]);

  const { axis: axisColor, grid: gridColor } = chartTheme || {};

  return (
    <div className="dash-ref-page" data-testid="dashboard-reference-layout">
      <section className="dash-ref-hero">
        <article
          className="dash-ref-card dash-ref-card--gauge"
          role="button"
          tabIndex={0}
          data-testid="dashboard-ref-gauge-card"
          onClick={() => onNavigate("/documents")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigate("/documents");
            }
          }}
        >
          <div className="dash-ref-card-head">
            <h2>{t("dashboard.reference.documentHealth")}</h2>
            <TimelineRangeSelect testId="dashboard-ref-range-gauge" timelineDays={timelineDays} onTimelineDaysChange={onTimelineDaysChange} t={t} />
          </div>
          <div className="dash-ref-gauge-wrap" aria-label={`${healthPct}%`}>
            <div
              className="dash-ref-gauge"
              style={{ "--dash-ref-pct-deg": `${Math.min(180, Math.max(0, healthPct) * 1.8)}deg` }}
            >
              <strong>{healthPct}%</strong>
            </div>
          </div>
          <div className="dash-ref-status-row">
            <span>{t("dashboard.reference.systemStatus")}</span>
            <span className="dash-ref-status-pill dash-ref-status-pill--ok">{healthPct >= 50 ? t("dashboard.reference.healthy") : t("dashboard.reference.watch")}</span>
          </div>
          <p className="dash-ref-footnote">{t("dashboard.reference.healthFootnote", { certified: nf.format(certified), sample: nf.format(sampleSize) })}</p>
        </article>

        <article className="dash-ref-card dash-ref-card--metrics-split">
          <div className="dash-ref-card-head">
            <div />
            <TimelineRangeSelect testId="dashboard-ref-range-metrics" timelineDays={timelineDays} onTimelineDaysChange={onTimelineDaysChange} t={t} />
          </div>
          <div className="dash-ref-metric-stack">
            <div className="dash-ref-metric-block dash-ref-metric-block--bordered">
              <h3>{t("dashboard.reference.completedPayments")}</h3>
              <strong>{nf.format(paidCount)}</strong>
              <div className="dash-ref-metric-meta">
                <TrendPill trend={txTrend} t={t} />
                <span>{t("dashboard.reference.sincePriorWeek")}</span>
              </div>
            </div>
            <div className="dash-ref-metric-block">
              <h3>{t("dashboard.reference.paidVolumeSample")}</h3>
              <strong>{formatBillingCurrency(paidVol, "SAR", language)}</strong>
              <div className="dash-ref-metric-meta">
                <TrendPill trend={amtTrend} t={t} />
                <span>{t("dashboard.reference.sincePriorWeek")}</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dash-ref-middle">
        <article className="dash-ref-card dash-ref-card--usage">
          <div className="dash-ref-card-head">
            <h2>{t("dashboard.reference.usageOverview")}</h2>
            <TimelineRangeSelect testId="dashboard-ref-range-usage" timelineDays={timelineDays} onTimelineDaysChange={onTimelineDaysChange} t={t} />
          </div>
          <div className="dash-ref-quad">
            <button type="button" className="dash-ref-quad-cell" data-testid="dashboard-ref-quad-users" onClick={() => onNavigate("/users")}>
              <span className="dash-ref-quad-icon dash-ref-quad-icon--purple">
                <CircleUserRound size={20} aria-hidden />
              </span>
              <h3>{t("dashboard.reference.totalUsers")}</h3>
              <strong>{nf.format(typeof agg.users === "number" ? agg.users : 0)}</strong>
              <span className="dash-ref-cell-note">{t("dashboard.reference.firestoreLive")}</span>
            </button>
            <button type="button" className="dash-ref-quad-cell" data-testid="dashboard-ref-quad-docs" onClick={() => onNavigate("/documents")}>
              <span className="dash-ref-quad-icon dash-ref-quad-icon--green">
                <FileText size={20} aria-hidden />
              </span>
              <h3>{t("dashboard.reference.totalDocuments")}</h3>
              <strong>{nf.format(typeof agg.documents === "number" ? agg.documents : 0)}</strong>
              <span className="dash-ref-cell-note">{t("dashboard.reference.firestoreLive")}</span>
            </button>
            <button type="button" className="dash-ref-quad-cell" data-testid="dashboard-ref-quad-orgs" onClick={() => onNavigate("/organizations")}>
              <span className="dash-ref-quad-icon dash-ref-quad-icon--blue">
                <ShieldCheck size={20} aria-hidden />
              </span>
              <h3>{t("dashboard.reference.totalOrganizations")}</h3>
              <strong>{nf.format(typeof agg.organizations === "number" ? agg.organizations : 0)}</strong>
              <span className="dash-ref-cell-note">{t("dashboard.reference.firestoreLive")}</span>
            </button>
            <button type="button" className="dash-ref-quad-cell" data-testid="dashboard-ref-quad-payments" onClick={() => onNavigate("/billing")}>
              <span className="dash-ref-quad-icon dash-ref-quad-icon--rose">
                <CreditCard size={20} aria-hidden />
              </span>
              <h3>{t("dashboard.reference.paymentRecords")}</h3>
              <strong>{nf.format(typeof agg.paymentsTotal === "number" ? agg.paymentsTotal : 0)}</strong>
              <span className="dash-ref-cell-note">{t("dashboard.reference.firestoreLive")}</span>
            </button>
          </div>
        </article>
      </section>

      <article className="dash-ref-card dash-ref-card--chart-wide">
        <div className="dash-ref-card-head">
          <div>
            <h2>{t("dashboard.reference.activityTrendTitle")}</h2>
            <p className="dash-ref-chart-sub">{t("dashboard.reference.activityTrendSubtitle")}</p>
          </div>
          <TimelineRangeSelect testId="dashboard-ref-range-chart" timelineDays={timelineDays} onTimelineDaysChange={onTimelineDaysChange} t={t} />
        </div>
        <div className="dash-ref-chart-legend">
          <span className="dash-ref-legend-dot dash-ref-legend-dot--purple" />
          <span>{t("dashboard.reference.legendTransactions")}</span>
          <span className="dash-ref-legend-dot dash-ref-legend-dot--blue" />
          <span>{t("dashboard.reference.legendPaidSar")}</span>
        </div>
        <div className="dash-ref-chart-canvas">
          {chartMerged.some((r) => r.tx > 0 || r.sar > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartMerged} margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 6" strokeOpacity={0.65} vertical={false} />
                <XAxis dataKey="dayKey" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} tickFormatter={(dk) => shortDayLabel(dk, language)} minTickGap={28} />
                <YAxis yAxisId="left" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} width={44} />
                <YAxis yAxisId="right" orientation="right" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} width={52} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload;
                    return (
                      <div className="dashboard-analytics-tooltip" style={{ borderColor: axisColor }}>
                        <strong>{shortDayLabel(row.dayKey, language)}</strong>
                        <div>
                          {t("dashboard.reference.legendTransactions")}: {nf.format(row.tx)}
                        </div>
                        <div>{formatBillingCurrency(row.sar, "SAR", language)}</div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ display: "none" }} />
                <Line yAxisId="left" type="monotone" dataKey="tx" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name={t("dashboard.reference.legendTransactions")} />
                <Line yAxisId="right" type="monotone" dataKey="sar" stroke="#3385f0" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name={t("dashboard.reference.legendPaidSar")} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="dash-ref-chart-empty">{t("dashboard.reference.chartEmpty")}</p>
          )}
        </div>
      </article>
    </div>
  );
}
