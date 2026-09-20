import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/account" as const, label: "My details" },
  { to: "/orders" as const, label: "Current orders" },
  { to: "/order-history" as const, label: "Order history" },
];

export function ProfileMenu({ email }: { email?: string | null }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-medium uppercase sm:text-3xl">My profile</h1>
      {email ? <p className="mt-2 text-[10px] font-semibold text-muted-foreground">{email}</p> : null}
      <nav className="mt-6 flex w-fit border border-border bg-secondary" aria-label="Profile sections">
        {tabs.map((tab) => (
          <Link key={tab.to} to={tab.to} className={cn("border-r border-border px-4 py-2 text-xs font-semibold last:border-r-0", pathname === tab.to ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card/70")}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}