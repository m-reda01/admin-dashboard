import React from "react";

/**
 * Unified shell for admin list/index screens (toolbar + actions), aligned with Aurora-style layouts.
 * Add modifier classes via `className` (e.g. organizations-management-page, documents-management-page).
 */
export function ManagementIndexLayout({
  afterToolbar = null,
  beforeToolbar = null,
  children,
  className = "",
  toolbarActions,
  toolbarAlert = null,
  ...rootProps
}) {
  const rootClass = ["admin-index-page", "users-management-page", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} {...rootProps}>
      {beforeToolbar}
      <div className="users-toolbar">
        {toolbarAlert}
        <div className="users-toolbar-actions">{toolbarActions}</div>
      </div>
      {afterToolbar}
      {children}
    </div>
  );
}
