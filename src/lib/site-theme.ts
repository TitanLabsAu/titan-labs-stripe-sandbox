import { useEffect, useState } from "react";

export type SiteTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "titan-site-theme";
export const THEME_EVENT = "titan-theme-change";

/** Runs in <head> before paint so a saved light preference does not flash dark. */
export const THEME_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light"){var d=document.documentElement;d.classList.remove("dark");d.classList.add("light");d.dataset.theme="light";}}catch(e){}})();`;

export function getStoredTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function paintTheme(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset["theme"] = theme;
}

/** Device-only preference: never writes CMS or site-wide state. */
export function applySiteTheme(theme: SiteTheme) {
  paintTheme(theme);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable — theme still applies for this page view */
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

/** Shared reactive theme state for the header toggle, Admin toggle and themed images. */
export function useSiteTheme() {
  const [theme, setTheme] = useState<SiteTheme>("dark");
  useEffect(() => {
    setTheme(getStoredTheme());
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<SiteTheme>).detail;
      setTheme(next === "light" ? "light" : "dark");
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next: SiteTheme = e.newValue === "light" ? "light" : "dark";
      paintTheme(next);
      setTheme(next);
    };
    window.addEventListener(THEME_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return { theme, setTheme: applySiteTheme };
}
