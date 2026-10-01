export type SiteTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "titan-site-theme";

export function getStoredTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export function applySiteTheme(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.dataset["theme"] = theme;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent("titan-theme-change", { detail: theme }));
  }
}
