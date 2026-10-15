import { createFileRoute } from "@tanstack/react-router";
import { AdminTitanClubView } from "@/components/AdminTitanClub";
import { TitanClubView } from "@/components/TitanClubBadge";
import { FoundationMemberView } from "@/components/FoundationMemberBadge";
import { DEFAULT_PRICING_SETTINGS, clubLabel, quoteOrder } from "@/lib/order-pricing";
import { formatPrice } from "@/lib/products";

// TEMPORARY local preview with DUMMY records only. Deleted after screenshots.
export const Route = createFileRoute("/club-preview")({
  head: () => ({ meta: [{ title: "Preview" }, { name: "robots", content: "noindex" }] }),
  component: Preview,
});

const now = "2026-10-15T04:00:00Z";
const data = {
  installed: true, enabled: false, siteCapPercent: 20,
  members: [
    { userId: "00000000-demo-0000-0000-000000000001", name: "Demo Member A", email: "demo-a@example.test", type: "percent" as const, percent: 25, fixedCents: 0, maxCapPercent: 30, active: true, note: "DUMMY – preview only", assignedAt: now, updatedAt: now, revokedAt: null },
    { userId: "00000000-demo-0000-0000-000000000002", name: "Demo Member B", email: "demo-b@example.test", type: "fixed" as const, percent: 0, fixedCents: 1000, maxCapPercent: 20, active: true, note: "", assignedAt: now, updatedAt: now, revokedAt: null },
  ],
  events: [{ id: "e1", userId: "00000000-demo-0000-0000-000000000001", name: "Demo Member A", action: "assign", before: null, after: { benefit_type: "percent", percent: 25, max_cap_percent: 30 }, createdAt: now }],
};

function Summary({ title, club }: { title: string; club: any }) {
  const q = quoteOrder({ lines: [{ unitCents: 10000, baseCents: 10000, quantity: 4 }], shippingMethod: "express", paymentMethod: "payid", club }, DEFAULT_PRICING_SETTINGS);
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      <p className="mb-2 font-bold uppercase text-foreground">{title}</p>
      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(q.itemsCents / 100)}</span></div>
      <div className="flex justify-between font-bold text-accent"><span>Titan Stack {q.multibuyPercent}% off</span><span>−{formatPrice(q.multibuyCents / 100)}</span></div>
      {q.clubCents > 0 ? <div className="flex justify-between font-bold text-accent"><span>Titan Club {clubLabel(q)}</span><span>−{formatPrice(q.clubCents / 100)}</span></div> : null}
      <p className="text-xs text-muted-foreground">Your personal maximum combined saving is {q.capPercent}% of products.</p>
      {q.notices.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
      <div className="mt-2 flex justify-between font-bold text-foreground"><span>Total</span><span>{formatPrice(q.totalCents / 100)}</span></div>
    </div>
  );
}

function Preview() {
  const draft = { userId: "00000000-demo-0000-0000-000000000001", name: "Demo Member A", email: "demo-a@example.test", type: "percent" as const, amount: "25", maxCap: "30", note: "DUMMY – preview only", active: true, isNew: false };
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4">
      <p className="rounded bg-destructive p-2 text-center text-xs font-bold uppercase text-destructive-foreground">Preview — dummy records only, not real members</p>
      <AdminTitanClubView data={data} search={async () => []} onSave={() => {}} onToggle={() => {}} initialDraft={draft} />
      <TitanClubView club={{ type: "percent", percent: 25, fixedCents: 0, maxCapPercent: 30, assignedAt: now }} />
      <TitanClubView club={{ type: "fixed", percent: 0, fixedCents: 1000, maxCapPercent: 20, assignedAt: now }} />
      <FoundationMemberView data={{ award: { memberNumber: 7, awardedAt: now }, status: { enrolmentEnabled: true, launched: true, capacity: 50, benefitPercent: 5, awarded: 7 } }} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Summary title="Checkout: 25% Club, personal 30% max" club={{ type: "percent", percent: 25, maxCapPercent: 30 }} />
        <Summary title="Checkout: $10 Club, site 20% cap" club={{ type: "fixed", fixedCents: 1000, maxCapPercent: 20 }} />
      </div>
    </main>
  );
}
