import React from "react";
import { Check, Monitor, RotateCcw, X } from "lucide-react";
import { primaryColors, themePresets, useAdminTheme } from "../theme/AdminThemeProvider.jsx";

export function AdminSettingsPanel({ isOpen, onClose }) {
  const { primaryColor, resetTheme, setPrimaryColor, setThemePreset, themePreset } = useAdminTheme();

  if (!isOpen) return null;

  return (
    <aside className="admin-settings-panel" aria-label="Customize">
      <header className="admin-settings-header">
        <strong>Customize</strong>
        <button type="button" onClick={resetTheme}>
          <RotateCcw size={14} />
          Reset
        </button>
        <button className="admin-settings-close" type="button" onClick={onClose} aria-label="Close customize">
          <X size={18} />
        </button>
      </header>

      <div className="admin-settings-scroll">
        <section className="admin-settings-section">
          <h2>
            Theme
            <span>New</span>
          </h2>
          <div className="admin-theme-list">
            {themePresets.map((preset) => (
              <button
                className={preset.id === themePreset ? "is-active" : ""}
                type="button"
                key={preset.id}
                onClick={() => setThemePreset(preset.id)}
              >
                <span className="admin-theme-radio">{preset.id === themePreset && <Check size={12} />}</span>
                <span>{preset.label}</span>
                <span className="admin-theme-swatches">
                  {preset.id === "system" && <Monitor size={13} />}
                  {preset.swatches.map((color) => (
                    <i key={color} style={{ backgroundColor: color }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-settings-section">
          <h2>Primary Color</h2>
          <div className="admin-primary-list">
            {primaryColors.map((color) => (
              <button
                className={color === primaryColor ? "is-active" : ""}
                type="button"
                key={color}
                style={{ backgroundColor: color }}
                aria-label={`Primary color ${color}`}
                onClick={() => setPrimaryColor(color)}
              >
                {color === primaryColor && <Check size={13} />}
              </button>
            ))}
          </div>
        </section>

        <section className="admin-settings-section">
          <h2>Navigation Menu</h2>
          <div className="admin-nav-layout-options">
            <button className="is-active" type="button" aria-label="Side navigation">
              <span />
              <span />
              <span />
              <span />
            </button>
            <button type="button" aria-label="Compact navigation">
              <span />
              <span />
              <span />
            </button>
            <button type="button" aria-label="Top navigation">
              <span />
              <span />
              <span />
            </button>
          </div>
          <p>And more...</p>
          <small>Coming Soon...</small>
        </section>
      </div>
    </aside>
  );
}
