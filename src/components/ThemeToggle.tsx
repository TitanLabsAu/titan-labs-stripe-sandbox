import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThemeSnapshot, useSiteTheme } from "@/lib/site-theme";

/**
 * Icon and accessible name are CSS-switched pairs, so they match the saved theme from first paint
 * (before hydration). Sun marks light mode, Moon marks dark mode.
 */
export function ThemeToggle() {
  const { setTheme } = useSiteTheme();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setTheme(getThemeSnapshot() === "light" ? "dark" : "light")}
      className="titan-nav-icon titan-theme-toggle min-h-11 min-w-11 shrink-0 p-0"
    >
      <span className="theme-label-dark"><Moon aria-hidden="true" /><span className="sr-only">Dark theme on. Switch to light theme</span></span>
      <span className="theme-label-light"><Sun aria-hidden="true" /><span className="sr-only">Light theme on. Switch to dark theme</span></span>
    </Button>
  );
}
