import React from "react";

export function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand" aria-label="DocsChain">
          <img className="auth-brand-full-logo" src="/assets/branding/docschain-logo-full.png" alt="DocsChain" />
        </div>
        <img className="auth-image" src="/assets/images/auth/login-illustration.svg" alt="" />
      </section>

      <section className="auth-form-area">
        {children}
      </section>
    </main>
  );
}
