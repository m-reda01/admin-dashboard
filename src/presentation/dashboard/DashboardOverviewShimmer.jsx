import React from "react";

function ShimmerBar({ className }) {
  return <span className={`dash-ref-shimmer-el ${className || ""}`} aria-hidden />;
}

export function DashboardOverviewShimmer() {
  return (
    <div className="dash-ref-page dash-ref-shimmer-root" data-testid="dashboard-overview-loading">
      <section className="dash-ref-hero">
        {[1, 2].map((k) => (
          <div key={k} className="dash-ref-card dash-ref-shimmer-surface">
            <ShimmerBar className="dash-ref-shimmer-el--title" />
            <ShimmerBar className={k === 2 ? "dash-ref-shimmer-el--metrics" : "dash-ref-shimmer-el--gauge"} />
            <ShimmerBar className="dash-ref-shimmer-el--footer" />
          </div>
        ))}
      </section>

      <section className="dash-ref-middle">
        <div className="dash-ref-card dash-ref-shimmer-surface dash-ref-card--usage">
          <ShimmerBar className="dash-ref-shimmer-el--title" />
          <div className="dash-ref-shimmer-quad">
            {[1, 2, 3, 4].map((q) => (
              <ShimmerBar key={q} className="dash-ref-shimmer-el--quad-cell" />
            ))}
          </div>
        </div>
      </section>

      <div className="dash-ref-card dash-ref-shimmer-surface dash-ref-card--chart-wide">
        <ShimmerBar className="dash-ref-shimmer-el--title" />
        <ShimmerBar className="dash-ref-shimmer-el--subtitle" />
        <ShimmerBar className="dash-ref-shimmer-el--chart" />
      </div>
    </div>
  );
}
