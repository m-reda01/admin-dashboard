import React, { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CircleUserRound,
  CreditCard,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MessageSquareWarning,
  Settings,
  ShieldUser,
  Tag,
} from "lucide-react";
import { AdminRole } from "../../domain/auth/adminSession.js";
import { useAdminShell } from "../app/adminShellContext.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { useAdminTheme } from "../theme/AdminThemeProvider.jsx";

const navigationGroups = [
  {
    titleKey: "dashboard.nav.dashboard",
    items: [{ id: "dashboard", labelKey: "dashboard.nav.dashboard", icon: LayoutDashboard, route: "/dashboard" }],
  },
  {
    titleKey: "dashboard.nav.management",
    items: [
      { id: "users", labelKey: "dashboard.nav.users", icon: CircleUserRound, route: "/users" },
      { id: "organizations", labelKey: "dashboard.nav.organizations", icon: BriefcaseBusiness, route: "/organizations" },
    ],
  },
  {
    titleKey: "dashboard.nav.operations",
    items: [{ id: "documents", labelKey: "dashboard.nav.documents", icon: FileText, route: "/documents" }],
  },
  {
    titleKey: "dashboard.nav.subscriptions",
    items: [
      {
        id: "plans",
        labelKey: "dashboard.nav.plansManagement",
        icon: Tag,
        route: "/billing/plans",
        expandable: true,
        children: [
          { id: "billing", labelKey: "dashboard.nav.billingInvoicing", icon: CreditCard, route: "/billing" },
        ],
      },
    ],
  },
  {
    titleKey: "dashboard.nav.support",
    items: [
      {
        id: "complaints",
        labelKey: "dashboard.nav.complaints",
        icon: MessageSquareWarning,
        route: "/complaints",
      },
    ],
  },
  {
    titleKey: "dashboard.nav.settingsGroup",
    items: [
      {
        id: "admins",
        labelKey: "dashboard.nav.adminManagement",
        icon: ShieldUser,
        route: "/admins",
        expandable: true,
        children: [{ id: "settings", labelKey: "dashboard.nav.settings", icon: Settings, route: "/settings" }],
      },
    ],
  },
];

const languageOptions = [
  { code: "en", labelKey: "common.english", flag: "/assets/flags/gb.svg" },
  { code: "ar", labelKey: "common.arabicSaudi", flag: "/assets/flags/sa.svg" },
];

export function DashboardLayout({ activePage, children, onNavigate, session, title }) {
  const navGroups = useMemo(() => navigationGroupsForSession(session), [session]);
  const { language, setLanguage, t } = useI18n();
  const { signOut } = useAdminShell();
  const { toggleColorMode } = useAdminTheme();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => getInitialSidebarState());
  const displayName = session?.displayName || session?.email || "Admin";
  const email = session?.email || "";
  const photoURL = String(session?.photoURL ?? "").trim();
  const initials = getInitials(displayName);
  const selectedLanguage = languageOptions.find((item) => item.code === language) || languageOptions[0];
  const sidebarStateClass = isSidebarOpen ? "is-sidebar-open" : "is-sidebar-collapsed";

  useEffect(() => {
    if (!isLanguageMenuOpen && !isProfileMenuOpen) return undefined;
    function handlePointerDown(event) {
      const target = event.target;
      if (isLanguageMenuOpen && !target.closest("[data-dashboard-language-root]")) {
        setIsLanguageMenuOpen(false);
      }
      if (isProfileMenuOpen && !target.closest("[data-dashboard-profile-root]")) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isLanguageMenuOpen, isProfileMenuOpen]);

  function handleNavigation(route) {
    if (!route) return;
    onNavigate?.(route);
    if (window.matchMedia("(max-width: 900px)").matches) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <main className={`dashboard-page ${sidebarStateClass}`}>
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          {!isSidebarOpen && (
            <button
              className="dashboard-sidebar-close-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
          )}
          <div className="dashboard-sidebar-brand" aria-label="DocsChain">
            <img className="dashboard-brand-full-logo" src="/assets/branding/docschain-logo-full.png" alt="DocsChain" />
          </div>
        </div>

        <nav className="dashboard-nav" aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div className="dashboard-nav-group" key={group.titleKey}>
              <p className="dashboard-nav-group-title">{t(group.titleKey)}</p>
              {group.items.map((item) => {
                const childActive = item.children?.some((child) => child.id === activePage);
                return (
                  <div className="dashboard-nav-item-wrap" key={item.id}>
                    <button
                      className={`dashboard-nav-item ${item.id === activePage ? "is-active" : ""} ${childActive ? "is-expanded" : ""}`}
                      type="button"
                      disabled={!item.route}
                      data-label={t(item.labelKey)}
                      onClick={() => handleNavigation(item.route)}
                    >
                      <item.icon size={18} />
                      <span>{t(item.labelKey)}</span>
                    </button>
                    {item.children?.length ? (
                      <div className="dashboard-nav-subitems">
                        {item.children.map((child) => (
                          <button
                            className={`dashboard-nav-item dashboard-nav-subitem ${child.id === activePage ? "is-active" : ""}`}
                            type="button"
                            key={child.id}
                            disabled={child.disabled || !child.route}
                            data-label={t(child.labelKey)}
                            onClick={() => handleNavigation(child.route)}
                          >
                            <child.icon size={16} />
                            <span>{t(child.labelKey)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          {isSidebarOpen && (
            <button
              className="dashboard-sidebar-close-button"
              type="button"
              aria-label={t("dashboard.nav.collapse")}
              onClick={() => setIsSidebarOpen(false)}
            >
              <PanelCloseIcon />
            </button>
          )}
        </div>
      </aside>

      {isSidebarOpen && (
        <button
          className="dashboard-sidebar-backdrop"
          type="button"
          aria-label={t("dashboard.nav.collapse")}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-mobile-brand" aria-label="DocsChain">
            <button
              className="dashboard-mobile-menu-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={16} />
            </button>
            <img className="dashboard-mobile-brand-full-logo" src="/assets/branding/docschain-logo-full.png" alt="DocsChain" />
          </div>
          {!isSidebarOpen && (
            <button
              className="dashboard-drawer-toggle"
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
          )}
          <h1 className="dashboard-title">{title}</h1>

          <div className="dashboard-actions" aria-label={title}>
            <div className="dashboard-language-menu" data-dashboard-language-root>
              <button
                className="dashboard-icon-button dashboard-flag-button"
                type="button"
                aria-label={t("dashboard.actions.language")}
                aria-expanded={isLanguageMenuOpen}
                data-testid="dashboard-language-toggle"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsLanguageMenuOpen((value) => !value);
                }}
              >
                <img className="dashboard-flag" src={selectedLanguage.flag} alt="" aria-hidden="true" />
              </button>
              {isLanguageMenuOpen ? (
                <div className="dashboard-language-list">
                  {languageOptions.map((option) => (
                    <button
                      className={option.code === language ? "is-active" : ""}
                      type="button"
                      key={option.code}
                      data-testid={`dashboard-language-${option.code}`}
                      onClick={() => {
                        setLanguage(option.code);
                        setIsLanguageMenuOpen(false);
                      }}
                    >
                      <img className="dashboard-flag" src={option.flag} alt="" aria-hidden="true" />
                      <span>{t(option.labelKey)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              className="dashboard-icon-button"
              type="button"
              aria-label={t("dashboard.actions.toggleTheme")}
              data-testid="dashboard-theme-toggle"
              onClick={() => {
                setIsLanguageMenuOpen(false);
                setIsProfileMenuOpen(false);
                toggleColorMode();
              }}
            >
              <Lightbulb size={16} aria-hidden />
            </button>
            <div className="dashboard-profile-menu" data-dashboard-profile-root>
              <button
                className="dashboard-profile-button"
                type="button"
                aria-label={t("dashboard.actions.adminProfile")}
                aria-expanded={isProfileMenuOpen}
                data-testid="dashboard-profile-toggle"
                onClick={() => {
                  setIsLanguageMenuOpen(false);
                  setIsProfileMenuOpen((value) => !value);
                }}
              >
                {photoURL ? (
                  <img className="dashboard-profile-button-avatar" src={photoURL} alt="" decoding="async" />
                ) : (
                  <span>{initials}</span>
                )}
              </button>
              {isProfileMenuOpen ? (
                <div className="dashboard-profile-popover" role="dialog" aria-label={t("dashboard.actions.adminProfile")}>
                  <div className="dashboard-profile-popover-avatar">
                    {photoURL ? <img src={photoURL} alt="" decoding="async" /> : <span aria-hidden>{initials}</span>}
                  </div>
                  <p className="dashboard-profile-popover-name">{displayName}</p>
                  <p className="dashboard-profile-popover-email">{email || "—"}</p>
                  <button
                    className="dashboard-profile-logout"
                    type="button"
                    data-testid="dashboard-profile-logout"
                    onClick={async () => {
                      setIsProfileMenuOpen(false);
                      await signOut();
                    }}
                  >
                    {t("dashboard.actions.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}

function PanelCloseIcon() {
  return (
    <svg className="dashboard-panel-close-icon" viewBox="0 -960 960 960" aria-hidden="true">
      <path d="M660-368v-224q0-14-12-19t-22 5l-98 98q-12 12-12 28t12 28l98 98q10 10 22 5t12-19ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z" />
    </svg>
  );
}

function getInitialSidebarState() {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(max-width: 900px)").matches;
}

function getInitials(value) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

function navigationGroupsForSession(session) {
  if (session?.adminRole !== AdminRole.SUPPORT) return navigationGroups;
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => child.id !== "settings"),
        }))
        .filter((item) => item.id !== "admins" && (!item.children || item.children.length > 0)),
    }))
    .filter((group) => group.items.length > 0);
}
