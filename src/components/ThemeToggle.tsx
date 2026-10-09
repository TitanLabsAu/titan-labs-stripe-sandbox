import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteTheme } from "@/lib/site-theme";

export function ThemeToggle() {
  const { theme, setTheme } = useSiteTheme();
  const isLight = theme === "light";
  const next = isLight ? "dark" : "light";
  return (
    <Button
      type="button"
      variant="outline"
      role="switch"
      aria-checked={isLight}
      aria-label={`Toggle theme: switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
      className="titan-nav-icon titan-theme-toggle min-h-11 min-w-11 shrink-0 p-0"
    >
      {/* Sun marks light mode, Moon marks dark mode. */}
      {isLight ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
