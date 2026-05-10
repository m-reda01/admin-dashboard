import React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider.jsx";

const iconMap = {
  error: AlertCircle,
  success: CheckCircle2,
};

export function AppAlert({ message, onClose, variant = "error" }) {
  const { t } = useI18n();

  if (!message) return null;

  const Icon = iconMap[variant] || AlertCircle;

  return (
    <div className={`app-alert app-alert--${variant}`} role="alert">
      <Icon size={20} strokeWidth={2} />
      <p>{message}</p>
      {onClose && (
        <button type="button" aria-label={t("common.closeAlert")} onClick={onClose}>
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
