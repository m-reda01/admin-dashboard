import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "docschain_admin_theme";
const PRIMARY_STORAGE_KEY = "docschain_admin_primary_color";
const COLOR_MODE_STORAGE_KEY = "docschain_admin_color_mode";

export const themePresets = [
  { id: "default-light", label: "Light", mode: "light", swatches: ["#3385F0", "#ffffff"] },
  { id: "default-dark", label: "Dark", mode: "dark", swatches: ["#589BF3", "#06080A"] },
  { id: "system", label: "System", mode: "system", swatches: ["#3385F0", "#1B2124"] },
  { id: "luxury", label: "Luxury", mode: "light", swatches: ["#B35A63", "#F8FAFC"] },
  { id: "retro", label: "Retro", mode: "light", swatches: ["#6E8AA3", "#F4E9D4"] },
  { id: "arctic", label: "Arctic", mode: "light", swatches: ["#0DA6D6", "#F7FAFC"] },
  { id: "nature", label: "Nature", mode: "light", swatches: ["#099F69", "#F7FAFC"] },
  { id: "ember", label: "Ember", mode: "dark", swatches: ["#F68D2A", "#421A64"] },
  { id: "dracula", label: "Dracula", mode: "dark", swatches: ["#A641FA", "#262D30"] },
  { id: "midnight", label: "Midnight", mode: "dark", swatches: ["#7DB1F5", "#1A1F2E"] },
];

export const primaryColors = [
  "#3385F0",
  "#589BF3",
  "#6E8AA3",
  "#B35A63",
  "#0DA6D6",
  "#099F69",
  "#E8B482",
  "#A641FA",
  "#7D8CF5",
];

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readInitialColorMode(savedPresetId) {
  const preset = themePresets.find((item) => item.id === savedPresetId);
  if (preset?.mode === "system") return systemPrefersDark() ? "dark" : "light";
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  }
  if (preset?.mode === "dark") return "dark";
  if (preset?.mode === "light") return "light";
  return "light";
}

export function AdminThemeProvider({ children }) {
  const [themePreset, setThemePresetState] = useState(() => getSavedValue(THEME_STORAGE_KEY, "default-light"));
  const [primaryColor, setPrimaryColorState] = useState(() =>
    getSavedValue(PRIMARY_STORAGE_KEY, "#3385F0"),
  );
  const [colorMode, setColorModeState] = useState(() =>
    readInitialColorMode(getSavedValue(THEME_STORAGE_KEY, "default-light")),
  );

  useEffect(() => {
    const selectedPreset = themePresets.find((item) => item.id === themePreset) || themePresets[0];

    document.documentElement.dataset.theme = colorMode;
    document.documentElement.dataset.themePreset = selectedPreset.id;
    document.documentElement.dataset.auroraColorScheme = colorMode;
    document.documentElement.dataset.auroraPreset = selectedPreset.id;
    document.documentElement.style.setProperty("--theme-primary", primaryColor);
    document.documentElement.style.setProperty("--brand", primaryColor);
    document.documentElement.style.setProperty("--brand-strong", primaryColor);
    window.localStorage.setItem(THEME_STORAGE_KEY, selectedPreset.id);
    window.localStorage.setItem(PRIMARY_STORAGE_KEY, primaryColor);
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode, primaryColor, themePreset]);

  useEffect(() => {
    const preset = themePresets.find((item) => item.id === themePreset);
    if (preset?.mode !== "system") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setColorModeState(systemPrefersDark() ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themePreset]);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  function setThemePreset(nextPreset) {
    if (!themePresets.some((item) => item.id === nextPreset)) return;
    setThemePresetState(nextPreset);
    const preset = themePresets.find((item) => item.id === nextPreset);
    if (preset?.mode === "system") setColorModeState(systemPrefersDark() ? "dark" : "light");
    else if (preset?.mode === "dark") setColorModeState("dark");
    else if (preset?.mode === "light") setColorModeState("light");
  }

  function setPrimaryColor(nextColor) {
    if (primaryColors.includes(nextColor)) {
      setPrimaryColorState(nextColor);
    }
  }

  function resetTheme() {
    setThemePresetState("default-light");
    setPrimaryColorState("#3385F0");
    setColorModeState("light");
  }

  const value = useMemo(
    () => ({
      colorMode,
      primaryColor,
      resetTheme,
      setPrimaryColor,
      setThemePreset,
      themePreset,
      toggleColorMode,
    }),
    [colorMode, primaryColor, themePreset, toggleColorMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used inside AdminThemeProvider.");
  }

  return context;
}

function getSavedValue(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.localStorage.getItem(key) || fallback;
}
