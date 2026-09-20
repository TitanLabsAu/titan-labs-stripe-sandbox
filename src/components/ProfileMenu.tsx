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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
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
          <h1 className="text-2xl font-medium uppercase sm:text-3xl">My profile</h1>
          {email ? <p className="mt-2 text-[10px] font-semibold text-muted-foreground">{email}</p> : null}
        </div>
        <Button type="button" variant="outline" onClick={() => void handleSignOut()}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
      <nav className="mt-6 flex w-full overflow-x-auto border border-border bg-secondary sm:w-fit" aria-label="Profile sections">
        {tabs.map((tab) => (
          <Link key={tab.to} to={tab.to} className={cn("shrink-0 border-r border-border px-4 py-2 text-xs font-semibold last:border-r-0", pathname === tab.to ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card/70")}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}