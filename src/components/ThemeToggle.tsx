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
      className="titan-nav-icon titan-theme-toggle min-h-11 min-w-11 gap-2 px-3 text-xs font-bold uppercase"
    >
      {isLight ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
      <span>Toggle Theme</span>
    </Button>
  );
}
