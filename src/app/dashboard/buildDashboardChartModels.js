/** Pure chart-ready datasets derived from Firestore-backed dashboard payloads. */

const COMPLAINT_STATUS_ORDER = ["open", "in_progress", "pending", "resolved", "closed", "rejected"];
const PAYMENT_STATUS_ORDER = ["pending", "paid", "failed", "refunded", "cancelled"];
const DOC_PIPELINE_ORDER = ["certified", "pending", "uploaded", "rejected"];

export const STATUS_FILL = {
  complaint: {
    open: "#f59e0b",
    in_progress: "#a855f7",
    pending: "#fb923c",
    resolved: "#22c55e",
    closed: "#14b8a6",
    rejected: "#ef4444",
  },
  payment: {
    paid: "#22c55e",
    pending: "#94a3b8",
    failed: "#ef4444",
    refunded: "#a855f7",
    cancelled: "#64748b",
  },
  document: {
    certified: "#22c55e",
    pending: "#eab308",
    uploaded: "#38bdf8",
    rejected: "#ef4444",
  },
};

const PLATFORM_KEYS = ["users", "organizations", "documents", "plans", "payments", "complaints"];
const PLATFORM_COLORS = ["#7c3aed", "#0891b2", "#15803d", "#2563eb", "#e11d48", "#b45309"];

function dayKeyLocal(date) {
  const d = date instanceof Date ? date : date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rollingDayLabels(dayCount) {
  const labels = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    labels.push(dayKeyLocal(d));
  }
  return labels;
}

function bucketCountByDay(items, getDate, dayCount) {
  const labels = rollingDayLabels(dayCount);
  const map = new Map();
  for (const row of items) {
    const dk = dayKeyLocal(getDate(row));
    if (!dk) continue;
    map.set(dk, (map.get(dk) || 0) + 1);
  }
  return labels.map((label) => ({ dayKey: label, value: map.get(label) || 0 }));
}

function bucketPaidAmountByDay(payments, dayCount) {
  const labels = rollingDayLabels(dayCount);
  const map = new Map();
  for (const p of payments) {
    if (String(p.status ?? "").toLowerCase() !== "paid") continue;
    const dk = dayKeyLocal(p.createdAt);
    if (!dk) continue;
    map.set(dk, (map.get(dk) || 0) + (Number(p.amount) || 0));
  }
  return labels.map((label) => ({ dayKey: label, value: map.get(label) || 0 }));
}

function aggregateComplaintTypes(complaints, limit = 10) {
  const map = new Map();
  for (const c of complaints) {
    const label = String(c.typeLabel || c.typeKey || "other").trim() || "other";
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name: truncate(name, 28), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function truncate(s, max) {
  const str = String(s);
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

function pieFromCounts(order, counts, fills) {
  return order.map((id) => ({
    id,
    value: typeof counts?.[id] === "number" && !Number.isNaN(counts[id]) ? counts[id] : 0,
    fill: fills[id] || "#94a3b8",
  }));
}

export function buildDashboardChartModels({
  aggregateCounts,
  plans,
  plansCount,
  users,
  organizations,
  documents,
  payments,
  complaints,
  documentPipelineCounts,
  timelineDays = 21,
}) {
  const agg = aggregateCounts || {};
  const complaintsByStatus = agg.complaintsByStatus || {};
  const paymentsByStatus = agg.paymentsByStatus || {};

  const safeNum = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

  const platformTotals = PLATFORM_KEYS.map((key, i) => {
    let value = 0;
    if (key === "users") value = safeNum(agg.users);
    else if (key === "organizations") value = safeNum(agg.organizations);
    else if (key === "documents") value = safeNum(agg.documents);
    else if (key === "plans") value = typeof plansCount === "number" ? plansCount : plans?.length || 0;
    else if (key === "payments") value = safeNum(agg.paymentsTotal);
    else if (key === "complaints") value = safeNum(agg.complaintsTotal);
    return { id: key, value, fill: PLATFORM_COLORS[i % PLATFORM_COLORS.length] };
  });

  const maxPlatform = Math.max(...platformTotals.map((r) => r.value), 1);
  const radarDomains = platformTotals.map((row) => ({
    subjectId: row.id,
    score: (row.value / maxPlatform) * 100,
    fullValue: row.value,
  }));

  const radialTotals = platformTotals.map((row) => ({
    name: row.id,
    uv: maxPlatform ? (row.value / maxPlatform) * 100 : 0,
    fill: row.fill,
    fullValue: row.value,
  }));

  const complaintsPie = pieFromCounts(COMPLAINT_STATUS_ORDER, complaintsByStatus, STATUS_FILL.complaint);
  const paymentsPie = pieFromCounts(PAYMENT_STATUS_ORDER, paymentsByStatus, STATUS_FILL.payment);
  const documentsPie = pieFromCounts(DOC_PIPELINE_ORDER, documentPipelineCounts || {}, STATUS_FILL.document);

  const paymentsCountSeries = bucketCountByDay(payments, (p) => p.createdAt, timelineDays);
  const paymentsPaidAmountSeries = bucketPaidAmountByDay(payments, timelineDays);
  const documentsSeries = bucketCountByDay(documents, (d) => d.createdAt, timelineDays);
  const usersSeries = bucketCountByDay(users, (u) => u.createdAt, timelineDays);
  const orgsSeries = bucketCountByDay(organizations, (o) => o.createdAt, timelineDays);
  const complaintsSeries = bucketCountByDay(complaints, (c) => c.createdAt, timelineDays);

  const complaintTypes = aggregateComplaintTypes(complaints, 12);

  const plansPricing = (plans || []).map((p, idx) => ({
    id: p.id || String(idx),
    name: truncate(p.name || p.id || "Plan", 24),
    price: Number(p.price) || 0,
    currency: String(p.currency || "SAR"),
    fill: PLATFORM_COLORS[idx % PLATFORM_COLORS.length],
  }));

  const plansScatter = (plans || []).map((p, idx) => ({
    id: p.id || String(idx),
    name: truncate(p.name || "Plan", 20),
    price: Number(p.price) || 0,
    certs: Number(p.certificationsLimit) || 0,
    members: Number(p.membersLimit) || 0,
    fill: PLATFORM_COLORS[idx % PLATFORM_COLORS.length],
  }));

  return {
    platformTotals,
    radarDomains,
    radialTotals,
    complaintsPie,
    paymentsPie,
    documentsPie,
    complaintsBar: complaintsPie.filter((x) => x.value > 0),
    paymentsBar: paymentsPie.filter((x) => x.value > 0),
    paymentsCountSeries,
    paymentsPaidAmountSeries,
    documentsSeries,
    usersSeries,
    orgsSeries,
    complaintsSeries,
    complaintTypes,
    plansPricing,
    plansScatter,
    meta: {
      timelineDays,
      paymentsLoaded: payments?.length ?? 0,
      usersLoaded: users?.length ?? 0,
      organizationsLoaded: organizations?.length ?? 0,
      documentsLoaded: documents?.length ?? 0,
      complaintsLoaded: complaints?.length ?? 0,
    },
  };
}
