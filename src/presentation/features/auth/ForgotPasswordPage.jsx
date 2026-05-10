import React, { useEffect, useState } from "react";
import { AppAlert } from "../../components/AppAlert.jsx";
import { translateAuthError } from "../../i18n/authMessage.js";
import { useI18n } from "../../i18n/I18nProvider.jsx";
import { AuthLayout } from "../../layouts/AuthLayout.jsx";

const RESET_COOLDOWN_SECONDS = 120;

export function ForgotPasswordPage({ sendPasswordResetUseCase }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setCooldownRemaining((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cooldownRemaining]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await sendPasswordResetUseCase.execute({ email });
      setSuccess(t("auth.resetEmailSent", { email }));
      setCooldownRemaining(RESET_COOLDOWN_SECONDS);
    } catch (err) {
      setError(translateAuthError(err, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <form className="auth-form auth-form--forgot" onSubmit={handleSubmit}>
        <div className="auth-copy">
          <h1>{t("auth.forgotPassword")}</h1>
          <p>{t("auth.forgotPasswordDescription")}</p>
        </div>

        <AppAlert message={error} variant="error" onClose={() => setError("")} />
        <AppAlert message={success} variant="success" onClose={() => setSuccess("")} />

        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
            setSuccess("");
          }}
          disabled={isSubmitting}
        />

        <button className="login-button" type="submit" disabled={isSubmitting || cooldownRemaining > 0}>
          {isSubmitting && <span className="button-spinner" aria-hidden="true" />}
          <span>
            {isSubmitting
              ? t("auth.sending")
              : cooldownRemaining > 0
                ? t("auth.sendAgainIn", { time: formatCooldown(cooldownRemaining) })
                : t("auth.sendResetLink")}
          </span>
        </button>
      </form>
    </AuthLayout>
  );
}

function formatCooldown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
