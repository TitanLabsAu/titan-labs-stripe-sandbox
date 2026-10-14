import { createFileRoute } from "@tanstack/react-router";
import { FoundationMemberView } from "@/components/FoundationMemberBadge";
import { AdminFoundationView } from "@/components/AdminFoundation";
import { quoteOrder } from "@/lib/order-pricing";

// TEMPORARY QA FIXTURE — demo data only, removed before commit.
export const Route = createFileRoute("/qa-foundation")({
  head: () => ({ meta: [{ title: "QA fixture" }, { name: "robots", content: "noindex" }] }),
  component: Fixture,
});

const status = { enrolmentEnabled: true, launched: true, capacity: 50, benefitPercent: 5, awarded: 7 };
const f = (c: number) => `$${(c / 100).toFixed(2)}`;

function Summary({ title, q }: { title: string; q: ReturnType<typeof quoteOrder> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm">
      <p className="mb-2 font-bold uppercase text-foreground">{title}</p>
      <div className="flex justify-between"><span>Subtotal</span><span>{f(q.itemsCents)}</span></div>
      {q.multibuyCents > 0 && <div className="flex justify-between font-bold text-accent"><span>Titan Stack {q.multibuyPercent}%</span><span>−{f(q.multibuyCents)}</span></div>}
      {q.foundationCents > 0 && <div className="flex justify-between font-bold text-accent"><span>Foundation Member {q.foundationPercent}%</span><span>−{f(q.foundationCents)}</span></div>}
      {q.foundationCapReached && <p className="text-xs text-muted-foreground">{q.foundationCents > 0 ? `Foundation Member saving reduced to keep total savings within ${q.capPercent}%.` : `Foundation Member: your other savings already reach the ${q.capPercent}% maximum.`}</p>}
      {q.creditCents > 0 && <div className="flex justify-between font-bold text-accent"><span>Referral reward</span><span>−{f(q.creditCents)}</span></div>}
      {q.notices.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
      <div className="mt-2 flex justify-between font-extrabold text-foreground"><span>Total</span><span>{f(q.totalCents)}</span></div>
    </div>
  );
}

function Fixture() {
  const l = (c: number, n: number) => [{ unitCents: c, baseCents: c, quantity: n }];
  return (
    <main className="page-shell space-y-6 py-8">
      <p className="rounded bg-destructive p-2 text-center font-bold text-destructive-foreground">DEMO DATA — QA FIXTURE, NOT REAL MEMBERS</p>
      <FoundationMemberView data={{ award: { memberNumber: 7, awardedAt: "2026-10-20T01:00:00Z" }, status }} />
      <FoundationMemberView data={{ award: null, status }} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Summary title="Demo: 2 items, 10% + Foundation 5%" q={quoteOrder({ lines: l(5000, 2), shippingMethod: "express", paymentMethod: "card", foundationPercent: 5 })} />
        <Summary title="Demo: 4 items, 20% reached" q={quoteOrder({ lines: l(2500, 4), shippingMethod: "express", paymentMethod: "card", foundationPercent: 5, creditUnits: 1, availableCreditUnits: 1 })} />
      </div>
      <AdminFoundationView onToggle={() => {}} data={{ enrolmentEnabled: false, launchedAt: null, capacity: 50, benefitPercent: 5, awards: [] }} />
      <AdminFoundationView onToggle={() => {}} data={{ enrolmentEnabled: true, launchedAt: "2026-10-20T00:00:00Z", capacity: 50, benefitPercent: 5, awards: [{ memberNumber: 1, name: "Demo Member A", order: "TL-9001", awardedAt: "2026-10-20T02:00:00Z" }, { memberNumber: 2, name: "Demo Member B", order: "TL-9002", awardedAt: "2026-10-20T03:00:00Z" }] }} />
    </main>
  );
}
