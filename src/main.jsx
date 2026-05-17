import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./presentation/app/App.jsx";
import { AppErrorBoundary } from "./presentation/app/AppErrorBoundary.jsx";
import { I18nProvider } from "./presentation/i18n/I18nProvider.jsx";
import { AdminThemeProvider } from "./presentation/theme/AdminThemeProvider.jsx";
import "./presentation/styles/index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AdminThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </AdminThemeProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);