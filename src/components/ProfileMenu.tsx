import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/account" as const, label: "My details" },
  { to: "/orders" as const, label: "Current orders" },
  { to: "/order-history" as const, label: "Order history" },
];

export function ProfileMenu({ email }: { email?: string | null | undefined }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mb-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="technical-label text-primary">Member profile</p>
          {email ? (
            <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
              {email}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
      <nav
        className="mt-4 flex gap-2 overflow-x-auto pb-1"
        aria-label="Profile sections"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={pathname === tab.to ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-xl border px-4 py-3 font-display text-xs font-bold uppercase tracking-wide transition-colors",
              pathname === tab.to
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
