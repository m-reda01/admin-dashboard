import React, { useCallback, useEffect, useMemo, useState } from "react";
import { buildDashboardChartModels } from "../../app/dashboard/buildDashboardChartModels.js";
import { DashboardOverviewShimmer } from "../dashboard/DashboardOverviewShimmer.jsx";
import { DashboardReferenceLayout } from "../dashboard/DashboardReferenceLayout.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { useAdminTheme } from "../theme/AdminThemeProvider.jsx";

function paymentCreatedMs(p) {
  const raw = p?.createdAt;
  if (raw && typeof raw.toDate === "function") return raw.toDate().getTime();
  if (raw instanceof Date) return raw.getTime();
  if (raw) {
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? NaN : t;
  }
  return NaN;
}

function computePaidSampleWindow(payments, timelineDays) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (timelineDays - 1));
  const startMs = start.getTime();
  let paidVolumeSample = 0;
  let paidCountWindow = 0;
  for (const p of payments || []) {
    if (String(p.status ?? "").toLowerCase() !== "paid") continue;
    const t = paymentCreatedMs(p);
    if (Number.isNaN(t) || t < startMs) continue;
    paidVolumeSample += Number(p.amount) || 0;
    paidCountWindow += 1;
  }
  return { paidVolumeSample, paidCountWindow };
}

export function HomePage({ getAdminDashboardOverviewUseCase, onNavigate, session }) {
  const { language, t } = useI18n();
  const { colorMode, primaryColor } = useAdminTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timelineDays, setTimelineDays] = useState(30);

  const chartTheme = useMemo(
    () => ({
      axis: colorMode === "dark" ? "#94a3b8" : "#64748b",
      grid: colorMode === "dark" ? "#334155" : "#e2e8f0",
      accent: primaryColor || "#6366f1",
    }),
    [colorMode, primaryColor],
  );

  const chartModels = useMemo(() => {
    if (!data?.chartInputs) return null;
    return buildDashboardChartModels({ ...data.chartInputs, timelineDays });
  }, [data?.chartInputs, timelineDays]);

  const layoutData = useMemo(() => {
    if (!data) return null;
    const payments = data.chartInputs?.payments;
    if (!payments) return data;
    const { paidVolumeSample, paidCountWindow } = computePaidSampleWindow(payments, timelineDays);
    return {
      ...data,
      paymentsSampleMeta: {
        ...data.paymentsSampleMeta,
        paidVolumeSample,
        paidCountWindow,
      },
    };
  }, [data, timelineDays]);

  const load = useCallback(async () => {
    if (!getAdminDashboardOverviewUseCase) return;
    setLoading(true);
    setError("");
    try {
      const next = await getAdminDashboardOverviewUseCase.execute();
      setData(next);
    } catch (e) {
      setError(e?.message || t("dashboard.overview.errorLoad"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [getAdminDashboardOverviewUseCase, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout activePage="dashboard" onNavigate={onNavigate} session={session} title={t("dashboard.title")}>
      <div className="dashboard-content dashboard-overview dashboard-analytics-root" data-testid="dashboard-overview-page">
        {error && (
          <div className="dashboard-overview-banner dashboard-overview-banner--error" role="alert">
            <span>{error}</span>
            <button type="button" data-testid="dashboard-overview-retry" onClick={load}>
              {t("dashboard.overview.retry")}
            </button>
          </div>
        )}

        {loading && !data ? <DashboardOverviewShimmer /> : null}

        {chartModels && layoutData ? (
          <DashboardReferenceLayout
            chartModels={chartModels}
            chartTheme={chartTheme}
            data={layoutData}
            language={language}
            onNavigate={onNavigate}
            onTimelineDaysChange={setTimelineDays}
            t={t}
            timelineDays={timelineDays}
          />
        ) : null}
      </div>
    </DashboardLayout>
  );
}
