import { useSyncExternalStore } from "react";

export type SiteTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "titan-site-theme";
export const THEME_EVENT = "titan-theme-change";

/**
 * Runs in <head> before paint so a saved light preference paints light from the first frame.
 * Themed images/labels are rendered as CSS-switched pairs, so no URL depends on hydration.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement,t="light";try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")t="dark";}catch(e){}d.classList.remove(t==="dark"?"light":"dark");d.classList.add(t);d.dataset.theme=t;})();`;

export function readStoredTheme(storage: Pick<Storage, "getItem"> | undefined | null): SiteTheme {
  try {
    return storage?.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getStoredTheme(): SiteTheme {
  if (typeof window === "undefined") return "light";
  let storage: Storage | null = null;
  try { storage = window.localStorage; } catch { /* blocked storage */ }
  return readStoredTheme(storage);
}

function paintTheme(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.dataset["theme"] = theme;
}

/* ---------- single shared store: one set of browser listeners for the whole app ---------- */
let current: SiteTheme | null = null;
const listeners = new Set<() => void>();
let detach: (() => void) | null = null;

function emit(next: SiteTheme) {
  if (current === next) return;
  current = next;
  listeners.forEach((l) => l());
}

function attach() {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function" || detach) return;
  const onChange = (e: Event) => emit((e as CustomEvent<SiteTheme>).detail === "light" ? "light" : "dark");
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    const next: SiteTheme = e.newValue === "dark" ? "dark" : "light";
    paintTheme(next);
    emit(next);
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  detach = () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    detach = null;
  };
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  attach();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) detach?.();
  };
}

export function getThemeSnapshot(): SiteTheme {
  if (current === null) current = getStoredTheme();
  return current;
}

const getServerSnapshot = (): SiteTheme => "light";

type BeforeSwitch = (next: SiteTheme) => Promise<unknown> | void;
let beforeSwitch: BeforeSwitch | null = null;
/** Lets the image cache keep outgoing artwork until the incoming artwork is decoded. */
export function setThemeSwitchHook(hook: BeforeSwitch | null) { beforeSwitch = hook; }

let switchToken = 0;
/** Device-only preference: never writes CMS or site-wide state. */
export function applySiteTheme(theme: SiteTheme) {
  const token = ++switchToken;
  const commit = () => {
    if (token !== switchToken) return;
    paintTheme(theme);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — theme still applies for this page view */
    }
    emit(theme);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
  };
  const pending = beforeSwitch?.(theme);
  if (pending && typeof (pending as Promise<unknown>).then === "function") {
    void (pending as Promise<unknown>).then(commit, commit);
  } else commit();
}

/** Shared reactive theme state for the header toggle, Admin toggle and themed images. */
export function useSiteTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);
  return { theme, setTheme: applySiteTheme };
}
