// TEMPORARY dummy-data QA fixture — delete after screenshots.
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AdminMemberTitanClubView } from "@/components/AdminMemberTitanClub";
import type { AdminTitanClub } from "@/lib/titan-club.functions";

export const Route = createFileRoute("/qa-member-club-preview")({ component: Page });

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const data: AdminTitanClub = { installed: true, enabled: false, siteCapPercent: 20, members: [], events: [] };

function Foundation({ n }: { n: number | null }) {
  // Mirrors AdminMemberFoundation's markup (unchanged component needs live data).
  return (
    <section className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" />
        <div><p className="font-bold uppercase text-foreground">Foundation Member</p>
          <p className="text-sm text-muted-foreground">{n ? `Member #${String(n).padStart(2, "0")} of 50 · permanent 5% benefit` : "Not a Foundation Member"}</p></div></div>
      <Switch aria-label="Foundation Member" checked={n != null} />
    </section>
  );
}

function Page() {
  const save = () => Promise.reject(new Error("Preview only"));
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      <p className="rounded border border-primary p-2 text-xs font-bold uppercase text-primary">Dummy data preview — no real members</p>
      {[
        { id: A, name: "Demo Member A", email: "demo-a@example.test", f: 7, d: { type: "percent" as const, amount: "25", maxCap: "30", note: "Demo note: ambassador" } },
        { id: B, name: "Demo Member B", email: "demo-b@example.test", f: null, d: { type: "fixed" as const, amount: "15.00", maxCap: "20", note: "" } },
      ].map((m) => (
        <section key={m.id} aria-label="Membership" className="grid items-start gap-4 md:grid-cols-2" data-qa={m.id}>
          <Foundation n={m.f} />
          <AdminMemberTitanClubView key={m.id} member={{ userId: m.id, name: m.name, email: m.email }} data={data} onSave={save}
            initialDraft={{ userId: m.id, name: m.name, email: m.email, active: true, isNew: true, ...m.d }} />
        </section>
      ))}
    </div>
  );
}
