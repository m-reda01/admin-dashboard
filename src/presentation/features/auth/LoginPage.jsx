import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AppAlert } from "../../components/AppAlert.jsx";
import { AuthLayout } from "../../layouts/AuthLayout.jsx";
import { translateAuthError } from "../../i18n/authMessage.js";
import { useI18n } from "../../i18n/I18nProvider.jsx";

export function LoginPage({ onForgotPassword, onSignedIn, signInUseCase }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberDevice: true,
  });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSuccess("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const session = await signInUseCase.execute(form);
      setSuccess(t("auth.signedInAs", { name: session.displayName }));
      onSignedIn?.(session);
    } catch (err) {
      setError(translateAuthError(err, t));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{t("auth.login")}</h1>
        <AppAlert message={error} variant="error" onClose={() => setError("")} />
        <AppAlert message={success} variant="success" onClose={() => setSuccess("")} />

        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("auth.email")}
          value={form.email}
          onChange={updateField}
          disabled={isSubmitting}
        />

        <div className="password-input">
          <input
            name="password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("auth.password")}
            value={form.password}
            onChange={updateField}
            disabled={isSubmitting}
          />
          <button
            type="button"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            onClick={() => setIsPasswordVisible((value) => !value)}
            disabled={isSubmitting}
          >
            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="login-row">
          <label className="remember-device">
            <input
              name="rememberDevice"
              type="checkbox"
              checked={form.rememberDevice}
              onChange={updateField}
              disabled={isSubmitting}
            />
            <span>{t("auth.rememberDevice")}</span>
          </label>
          <button className="text-button" type="button" onClick={onForgotPassword}>
            {t("auth.forgotPassword")}
          </button>
        </div>

        <button className="login-button" type="submit" disabled={isSubmitting}>
          {isSubmitting && <span className="button-spinner" aria-hidden="true" />}
          <span>{isSubmitting ? t("auth.loggingIn") : t("auth.login")}</span>
        </button>
      </form>
    </AuthLayout>
  );
}
