import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { AppAlert } from "../components/AppAlert.jsx";
import { DashboardLayout } from "../layouts/DashboardLayout.jsx";
import { ManagementIndexLayout } from "../layouts/ManagementIndexLayout.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { getPaginationPages } from "../utils/pagination.js";

const PAGE_SIZE = 10;

function newPlanFeatureId() {
  return globalThis.crypto?.randomUUID?.() ?? `feat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PlansManagementPage({
  createSubscriptionPlanUseCase,
  deleteSubscriptionPlanUseCase,
  listSubscriptionPlansUseCase,
  onNavigate,
  session,
  updateSubscriptionPlanUseCase,
}) {
  const { t } = useI18n();
  const [plans, setPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogMode, setDialogMode] = useState(null);
  const [dialogPlan, setDialogPlan] = useState(null);
  const [pendingDeletePlans, setPendingDeletePlans] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState(() => new Set());

  async function reloadPlans() {
    const rows = await listSubscriptionPlansUseCase.execute();
    setPlans(rows);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        await reloadPlans();
      } catch (e) {
        if (mounted) setError(e?.message || t("plansManagement.loadError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [listSubscriptionPlansUseCase, t]);

  const visiblePlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => {
      const blob = [p.name, p.description, p.tag, p.audience, p.lifecycleStatus, p.id].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [plans, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(visiblePlans.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagePlans = visiblePlans.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const paginationPages = getPaginationPages(safePage, totalPages);

  const pagePlanIds = useMemo(() => pagePlans.map((p) => p.id), [pagePlans]);
  const isAllPageSelected =
    pagePlanIds.length > 0 && pagePlanIds.every((id) => selectedPlanIds.has(id));
  const isSomePageSelected = pagePlanIds.some((id) => selectedPlanIds.has(id));

  function handleSelectAllPage(checked) {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        pagePlanIds.forEach((id) => next.add(id));
      } else {
        pagePlanIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  }

  function handleSelectPlanRow(planId, checked) {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(planId);
      else next.delete(planId);
      return next;
    });
  }

  useEffect(() => {
    setSelectedPlanIds((prev) => {
      const valid = new Set(plans.map((p) => p.id));
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id);
        else changed = true;
      });
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [plans]);

  const selectedPlans = useMemo(
    () => plans.filter((p) => selectedPlanIds.has(p.id)),
    [plans, selectedPlanIds],
  );
  const isSelectionMode = selectedPlans.length > 0;

  function goToPage(n) {
    setCurrentPage(Math.min(Math.max(n, 1), totalPages));
  }

  function openCreate() {
    setDialogPlan(createEmptyPlanForm());
    setDialogMode("create");
  }

  function openEdit(plan) {
    setDialogPlan(planToForm(plan));
    setDialogMode("edit");
  }

  async function handleSubmitForm(form) {
    const validation = validatePlanForm(form, t);
    if (validation) {
      setAlert({ message: validation, variant: "error" });
      return;
    }

    const payloadBase = formToPayload(form);
    const maxSort = plans.reduce((acc, p) => Math.max(acc, Number(p.sortOrder) || 0), 0);
    const existingPlan = dialogMode === "edit" && form.id ? plans.find((planRow) => planRow.id === form.id) : null;
    const payload =
      dialogMode === "create"
        ? { ...payloadBase, sortOrder: maxSort + 1, isRecommended: false }
        : dialogMode === "edit" && form.id
          ? {
              ...payloadBase,
              sortOrder: Number(existingPlan?.sortOrder ?? 0),
              isRecommended: Boolean(existingPlan?.isRecommended),
            }
          : { ...payloadBase, isRecommended: false };

    setIsSaving(true);
    try {
      if (dialogMode === "create") {
        await createSubscriptionPlanUseCase.execute(payload);
        setAlert({ message: t("plansManagement.createSuccess"), variant: "success" });
      } else if (dialogMode === "edit" && form.id) {
        await updateSubscriptionPlanUseCase.execute(form.id, payload);
        setAlert({ message: t("plansManagement.updateSuccess"), variant: "success" });
      }
      setDialogMode(null);
      setDialogPlan(null);
      await reloadPlans();
    } catch (e) {
      setAlert({ message: e?.message || t("plansManagement.saveError"), variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeletePlans() {
    if (!pendingDeletePlans?.length) return;
    const toDelete = pendingDeletePlans;
    const isBulk = toDelete.length > 1;
    const deletedIds = [];
    setIsDeleting(true);
    try {
      for (const plan of toDelete) {
        await deleteSubscriptionPlanUseCase.execute(plan.id);
        deletedIds.push(plan.id);
      }
      setAlert({
        message: isBulk
          ? t("plansManagement.bulkDeleteSuccess", { count: deletedIds.length })
          : t("plansManagement.deleteSuccess", { name: toDelete[0].name }),
        variant: "success",
      });
      setPendingDeletePlans(null);
      setSelectedPlanIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      await reloadPlans();
    } catch (e) {
      if (deletedIds.length > 0) {
        setSelectedPlanIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
        await reloadPlans();
      }
      setAlert({
        message:
          deletedIds.length > 0
            ? t("plansManagement.bulkDeletePartial", {
                count: toDelete.length,
                deletedCount: deletedIds.length,
              })
            : e?.message || t("plansManagement.deleteError"),
        variant: "error",
      });
      setPendingDeletePlans(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DashboardLayout activePage="plans" onNavigate={onNavigate} session={session} title={t("plansManagement.title")}>
      <ManagementIndexLayout
        className="plans-management-page"
        toolbarAlert={<AppAlert message={alert?.message} variant={alert?.variant} onClose={() => setAlert(null)} />}
        toolbarActions={
          <>
            <label className="users-search">
              <Search size={18} />
              <input
                type="search"
                disabled={isSelectionMode}
                placeholder={t("plansManagement.search")}
                value={searchQuery}
                data-testid="plans-search-input"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            {isSelectionMode && (
              <button
                className="users-bulk-delete-button"
                type="button"
                data-testid="plans-bulk-delete-button"
                disabled={isDeleting}
                onClick={() => setPendingDeletePlans(selectedPlans.slice())}
              >
                <Trash2 size={16} aria-hidden />
                {t("plansManagement.deleteSelected", { count: selectedPlans.length })}
              </button>
            )}
            <button
              className="plans-add-plan-button"
              type="button"
              data-testid="plans-add-button"
              disabled={isSelectionMode}
              onClick={openCreate}
            >
              <Plus size={18} aria-hidden />
              <span>{t("plansManagement.addPlan")}</span>
            </button>
          </>
        }
      >
        <div className="users-table-shell plans-table-shell">
          <div className="users-table-scroll plans-table-scroll">
            <table className="plans-table" data-testid="plans-table">
              <thead>
                <tr>
                  <th className="users-checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={t("plansManagement.selectAll")}
                      checked={isAllPageSelected}
                      data-testid="plans-select-all"
                      disabled={pagePlanIds.length === 0 || isLoading}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomePageSelected && !isAllPageSelected;
                      }}
                      onChange={(e) => handleSelectAllPage(e.target.checked)}
                    />
                  </th>
                  <th>{t("plansManagement.cols.name")}</th>
                  <th>{t("plansManagement.cols.price")}</th>
                  <th>{t("plansManagement.cols.period")}</th>
                  <th>{t("plansManagement.cols.target")}</th>
                  <th>{t("plansManagement.cols.certify")}</th>
                  <th>{t("plansManagement.cols.membersLimit")}</th>
                  <th>{t("plansManagement.cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <PlansTableShimmerRows rowCount={PAGE_SIZE} />}
                {!isLoading && error && (
                  <tr>
                    <td colSpan={8} className="plans-empty-cell plans-empty-cell--error">
                      {error}
                    </td>
                  </tr>
                )}
                {!isLoading && !error && visiblePlans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="plans-empty-cell">
                      {t("plansManagement.empty")}
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !error &&
                  pagePlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className={selectedPlanIds.has(plan.id) ? "is-selected" : ""}
                      data-testid={`plan-row-${plan.id}`}
                    >
                      <td className="users-checkbox-cell">
                        <input
                          type="checkbox"
                          aria-label={t("plansManagement.selectPlan", { name: plan.name })}
                          checked={selectedPlanIds.has(plan.id)}
                          data-testid={`plans-row-checkbox-${plan.id}`}
                          onChange={(e) => handleSelectPlanRow(plan.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <strong>{plan.name}</strong>
                        <small className="plans-management-desc-preview">{plan.description}</small>
                      </td>
                      <td className="plans-table-price">
                        {plan.billing?.monthly?.amount ?? 0}{" "}
                        {plan.billing?.monthly?.currency ?? "SAR"}
                      </td>
                      <td>
                        <span className="plans-badge plans-badge--period plans-badge--period-monthly">
                          {t("plansManagement.periods.monthly")}
                        </span>
                      </td>
                      <td>
                        <span className="plans-target-cell">
                          <span className="plans-target-icons" aria-hidden>
                            {plan.audience === "organization" ? (
                              <BriefcaseBusiness size={16} />
                            ) : plan.audience === "both" ? (
                              <>
                                <BriefcaseBusiness size={16} />
                                <UserRound size={16} />
                              </>
                            ) : (
                              <UserRound size={16} />
                            )}
                          </span>
                          <span>{formatPlanTarget(plan.audience, t)}</span>
                        </span>
                      </td>
                      <td>{plan.limits?.certifications ?? 0}</td>
                      <td>{plan.limits?.members ?? 0}</td>
                      <td>
                        <div className="plans-actions-cell">
                          <button
                            type="button"
                            className="plans-action-edit"
                            aria-label={t("plansManagement.edit")}
                            data-testid={`plan-edit-${plan.id}`}
                            onClick={() => openEdit(plan)}
                          >
                            <Pencil size={20} strokeWidth={1.75} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="plans-action-delete"
                            aria-label={t("plansManagement.delete")}
                            data-testid={`plan-delete-${plan.id}`}
                            onClick={() => setPendingDeletePlans([plan])}
                          >
                            <Trash2 size={20} strokeWidth={1.75} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!isLoading && !error && visiblePlans.length > PAGE_SIZE && (
            <div className="users-pagination">
              <button type="button" disabled={safePage === 1} onClick={() => goToPage(1)}>
                <ChevronsLeft size={16} />
              </button>
              <button type="button" disabled={safePage === 1} onClick={() => goToPage(safePage - 1)}>
                <ChevronDown className="rotate-90" size={16} />
              </button>
              {paginationPages.map((page) => (
                <button
                  className={page === safePage ? "is-active" : ""}
                  type="button"
                  key={page}
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
          )}
        </div>

        {dialogMode && dialogPlan && (
          <PlanFormDialog
            form={dialogPlan}
            isSaving={isSaving}
            mode={dialogMode}
            onCancel={() => {
              setDialogMode(null);
              setDialogPlan(null);
            }}
            onSubmit={handleSubmitForm}
            t={t}
          />
        )}

        {pendingDeletePlans?.length > 0 && (
          <DeletePlanDialog
            isDeleting={isDeleting}
            plans={pendingDeletePlans}
            onCancel={() => setPendingDeletePlans(null)}
            onConfirm={confirmDeletePlans}
            t={t}
          />
        )}
      </ManagementIndexLayout>
    </DashboardLayout>
  );
}

function PlansTableShimmerRows({ rowCount }) {
  return Array.from({ length: rowCount }, (_, index) => (
    <tr className="users-shimmer-row" key={`plans-shimmer-${index}`}>
      <td className="users-checkbox-cell">
        <span className="users-shimmer users-shimmer-checkbox" />
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
      <td className="plans-table-price">
        <span className="users-shimmer users-shimmer-line users-shimmer-line--role" />
      </td>
      <td>
        <span className="users-shimmer users-shimmer-pill" />
      </td>
      <td>
        <span className="plans-target-cell">
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-line users-shimmer-line--role" />
        </span>
      </td>
      <td>
        <span className="users-shimmer users-shimmer-line users-shimmer-line--role" />
      </td>
      <td>
        <span className="users-shimmer users-shimmer-line users-shimmer-line--role" />
      </td>
      <td>
        <span className="users-shimmer-actions">
          <span className="users-shimmer users-shimmer-icon" />
          <span className="users-shimmer users-shimmer-icon" />
        </span>
      </td>
    </tr>
  ));
}

function createEmptyPlanForm() {
  return {
    name: "",
    description: "",
    monthlyPrice: "",
    audience: "organization",
    tag: "",
    certificationsLimit: "0",
    membersLimit: "0",
    features: [],
    extraCertificationPrice: "",
    extraMemberPrice: "",
  };
}

function planToForm(plan) {
  const featRows = Array.isArray(plan.features) ? plan.features : [];
  return {
    id: plan.id,
    name: plan.name ?? "",
    description: plan.description ?? "",
    monthlyPrice: String(plan.billing?.monthly?.amount ?? ""),
    audience: plan.audience ?? "individual",
    tag: plan.tag ?? "",
    certificationsLimit: String(plan.limits?.certifications ?? 0),
    membersLimit: String(plan.limits?.members ?? 0),
    features: featRows.map((text, idx) => ({
      id: `${plan.id}-feat-${idx}`,
      text: String(text ?? ""),
    })),
    extraCertificationPrice: String(plan.extras?.certificationUnitPrice ?? ""),
    extraMemberPrice: String(plan.extras?.memberUnitPrice ?? ""),
  };
}

function formToPayload(form) {
  const features = Array.isArray(form.features)
    ? form.features.map((row) => String(row?.text ?? "").trim()).filter(Boolean)
    : [];

  return {
    name: form.name.trim(),
    description: form.description.trim(),
    audience: form.audience,
    tag: form.tag.trim(),
    features,
    schemaVersion: 2,
    billing: {
      monthly: { amount: Number(form.monthlyPrice || 0), currency: "SAR" },
    },
    limits: {
      certifications: Number(form.certificationsLimit),
      members: Number(form.membersLimit),
    },
    extras: {
      certificationUnitPrice: Number(form.extraCertificationPrice || 0),
      memberUnitPrice: Number(form.extraMemberPrice || 0),
    },
  };
}

function countPlanFeatureRows(form) {
  if (!Array.isArray(form.features)) return 0;
  return form.features.map((row) => String(row?.text ?? "").trim()).filter(Boolean).length;
}

function parseNonNegativeNumberField(raw, t, requiredKey, invalidKey) {
  const s = String(raw ?? "").trim();
  if (s === "") return t(requiredKey);
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return t(invalidKey);
  return "";
}

function validatePlanForm(form, t) {
  if (!form.name.trim()) return t("plansManagement.validation.nameRequired");
  if (!form.description.trim()) return t("plansManagement.validation.descriptionRequired");
  const priceStr = String(form.monthlyPrice ?? "").trim();
  if (priceStr === "") return t("plansManagement.validation.priceRequired");
  const priceNum = Number(priceStr);
  if (Number.isNaN(priceNum) || priceNum < 0) return t("plansManagement.validation.priceInvalid");

  const certifyErr = parseNonNegativeNumberField(
    form.certificationsLimit,
    t,
    "plansManagement.validation.certifyRequired",
    "plansManagement.validation.certifyInvalid",
  );
  if (certifyErr) return certifyErr;

  const membersErr = parseNonNegativeNumberField(
    form.membersLimit,
    t,
    "plansManagement.validation.membersRequired",
    "plansManagement.validation.membersInvalid",
  );
  if (membersErr) return membersErr;
  if (countPlanFeatureRows(form) < 1) return t("plansManagement.validation.featuresRequired");

  return "";
}

function PlanFeaturesEditor({ items, onChange, t }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  function addFeature() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, { id: newPlanFeatureId(), text: trimmed }]);
    setDraft("");
  }

  function removeById(id) {
    onChange(items.filter((row) => row.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditDraft("");
    }
  }

  function beginEdit(row) {
    setEditingId(row.id);
    setEditDraft(row.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function commitEdit() {
    if (editingId === null) return;
    const trimmed = editDraft.trim();
    if (!trimmed) {
      removeById(editingId);
      return;
    }
    onChange(items.map((row) => (row.id === editingId ? { ...row, text: trimmed } : row)));
    setEditingId(null);
    setEditDraft("");
  }

  return (
    <div className="plans-features-editor plans-form-field plans-form-field--full" aria-required="true" data-field-required="features">
      <span>
        {t("plansManagement.fields.features")}
        <span className="plans-form-required-mark" aria-hidden>
          {" "}
          *
        </span>
      </span>
      <div className="plans-features-add-row">
        <input
          type="text"
          value={draft}
          placeholder={t("plansManagement.featuresDraftPlaceholder")}
          data-testid="plan-feature-draft-input"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFeature();
            }
          }}
        />
        <button type="button" className="plans-feature-add-button" data-testid="plan-feature-add-button" onClick={addFeature}>
          <Plus size={18} aria-hidden />
          <span>{t("plansManagement.featuresAdd")}</span>
        </button>
      </div>
      <ul className="plans-features-list" data-testid="plan-features-list">
        {items.map((row) => (
          <li key={row.id} className="plans-features-list-item">
            {editingId === row.id ? (
              <>
                <input
                  type="text"
                  className="plans-features-edit-input"
                  value={editDraft}
                  data-testid={`plan-feature-edit-input-${row.id}`}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitEdit();
                    }
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <div className="plans-features-item-actions">
                  <button
                    type="button"
                    className="plans-features-icon-button plans-features-icon-button--save"
                    aria-label={t("plansManagement.featuresSaveEdit")}
                    data-testid={`plan-feature-save-${row.id}`}
                    onClick={commitEdit}
                  >
                    <Check size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="plans-features-icon-button plans-features-icon-button--neutral"
                    aria-label={t("plansManagement.featuresCancelEdit")}
                    data-testid={`plan-feature-cancel-edit-${row.id}`}
                    onClick={cancelEdit}
                  >
                    <X size={18} aria-hidden />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="plans-features-list-text">{row.text}</span>
                <div className="plans-features-item-actions">
                  <button
                    type="button"
                    className="plans-features-icon-button plans-features-icon-button--edit"
                    aria-label={t("plansManagement.featuresEdit")}
                    data-testid={`plan-feature-edit-${row.id}`}
                    onClick={() => beginEdit(row)}
                  >
                    <Pencil size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="plans-features-icon-button plans-features-icon-button--delete"
                    aria-label={t("plansManagement.featuresRemove")}
                    data-testid={`plan-feature-remove-${row.id}`}
                    onClick={() => removeById(row.id)}
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanFormDialog({ form: initialForm, isSaving, mode, onCancel, onSubmit, t }) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    setForm({
      ...initialForm,
      features: Array.isArray(initialForm.features) ? initialForm.features : [],
    });
  }, [initialForm]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="edit-user-dialog plans-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="edit-user-dialog-header">
          <h2 id="plan-dialog-title">
            {mode === "create" ? t("plansManagement.dialogCreateTitle") : t("plansManagement.dialogEditTitle")}
          </h2>
          <button type="button" className="text-button" data-testid="plan-form-cancel" onClick={onCancel}>
            {t("plansManagement.cancel")}
          </button>
        </div>

        <form
          className="plans-form-grid"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <label className="plans-form-field plans-form-field--full">
            <span>
              {t("plansManagement.fields.name")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <input value={form.name} aria-required="true" data-testid="plan-form-name" onChange={(e) => update("name", e.target.value)} />
          </label>
          <label className="plans-form-field plans-form-field--full">
            <span>
              {t("plansManagement.fields.description")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <textarea
              rows={3}
              aria-required="true"
              value={form.description}
              data-testid="plan-form-description"
              onChange={(e) => update("description", e.target.value)}
            />
          </label>

          <label className="plans-form-field plans-form-field--full">
            <span>
              {t("plansManagement.fields.target")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <select aria-required="true" value={form.audience} data-testid="plan-form-target" onChange={(e) => update("audience", e.target.value)}>
              <option value="organization">{t("plansManagement.targets.organization")}</option>
              <option value="individual">{t("plansManagement.targets.individual")}</option>
              <option value="both">{t("plansManagement.targets.both")}</option>
            </select>
          </label>

          <label className="plans-form-field">
            <span>
              {t("plansManagement.fields.price")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <input
              type="number"
              min="0"
              step="1"
              aria-required="true"
              value={form.monthlyPrice}
              data-testid="plan-form-price"
              onChange={(e) => update("monthlyPrice", e.target.value)}
            />
          </label>
          <label className="plans-form-field">
            <span>
              {t("plansManagement.fields.period")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <input value={t("plansManagement.periods.monthly")} disabled data-testid="plan-form-period" />
          </label>
          <label className="plans-form-field">
            <span>
              {t("plansManagement.fields.certify")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <input
              type="number"
              min="0"
              step="1"
              aria-required="true"
              value={form.certificationsLimit}
              data-testid="plan-form-certify"
              onChange={(e) => update("certificationsLimit", e.target.value)}
            />
          </label>
          <label className="plans-form-field">
            <span>
              {t("plansManagement.fields.membersLimit")}
              <span className="plans-form-required-mark" aria-hidden>
                {" "}
                *
              </span>
            </span>
            <input
              type="number"
              min="0"
              step="1"
              aria-required="true"
              value={form.membersLimit}
              data-testid="plan-form-members-limit"
              onChange={(e) => update("membersLimit", e.target.value)}
            />
          </label>

          <label className="plans-form-field">
            <span>{t("plansManagement.fields.extraCertification")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.extraCertificationPrice}
              data-testid="plan-form-extra-cert-price"
              onChange={(e) => update("extraCertificationPrice", e.target.value)}
            />
          </label>
          <label className="plans-form-field">
            <span>{t("plansManagement.fields.extraMember")}</span>
            <input
              type="number"
              min="0"
              value={form.extraMemberPrice}
              data-testid="plan-form-extra-member-price"
              onChange={(e) => update("extraMemberPrice", e.target.value)}
            />
          </label>
          <label className="plans-form-field plans-form-field--full">
            <span>{t("plansManagement.fields.tag")}</span>
            <input value={form.tag} data-testid="plan-form-tag" onChange={(e) => update("tag", e.target.value)} />
          </label>

          <PlanFeaturesEditor
            key={`${mode}-${form.id ?? "new"}`}
            items={form.features}
            t={t}
            onChange={(next) => update("features", next)}
          />

          <div className="confirm-dialog-actions plans-form-actions">
            <button type="button" className="confirm-dialog-button confirm-dialog-button--neutral" data-testid="plan-form-cancel-footer" onClick={onCancel}>
              {t("plansManagement.cancel")}
            </button>
            <button type="submit" className="confirm-dialog-button confirm-dialog-button--primary" data-testid="plan-form-save" disabled={isSaving}>
              {isSaving ? t("plansManagement.saving") : t("plansManagement.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeletePlanDialog({ isDeleting, onCancel, onConfirm, plans, t }) {
  if (!plans?.length) return null;
  const isBulk = plans.length > 1;

  return (
    <div className="confirm-dialog-backdrop plans-delete-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="confirm-dialog plans-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-plan-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="plans-delete-dialog-body">
          <div className="plans-delete-dialog-icon-wrap" aria-hidden>
            <Trash2 size={22} />
          </div>
          <div className="plans-delete-dialog-copy">
            <h2 id="delete-plan-dialog-title">
              {isBulk ? t("plansManagement.bulkDeleteDialogTitle") : t("plansManagement.deleteDialogTitle")}
            </h2>
            <p>
              {isBulk
                ? t("plansManagement.bulkDeleteDialogDescription", { count: plans.length })
                : t("plansManagement.deleteDialogDescription", { name: plans[0].name })}
            </p>
          </div>
        </div>
        <div className="confirm-dialog-actions plans-delete-dialog-actions">
          <button type="button" className="confirm-dialog-button confirm-dialog-button--neutral" data-testid="delete-plan-cancel" onClick={onCancel}>
            {t("plansManagement.cancel")}
          </button>
          <button
            type="button"
            className="confirm-dialog-button confirm-dialog-button--danger plans-delete-dialog-confirm"
            data-testid="delete-plan-confirm"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? t("plansManagement.deleting") : t("plansManagement.confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatPlanPeriod(period, t) {
  if (period === "monthly") return t("plansManagement.periods.monthly");
  if (period === "yearly") return t("plansManagement.periods.yearly");
  return period || "—";
}

function formatPlanTarget(target, t) {
  if (target === "individual") return t("plansManagement.targets.individual");
  if (target === "organization") return t("plansManagement.targets.organization");
  if (target === "both") return t("plansManagement.targets.both");
  return target || "—";
}
