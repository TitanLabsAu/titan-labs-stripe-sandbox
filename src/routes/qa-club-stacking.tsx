// TEMPORARY dummy-data fixture for screenshots. Delete after capture.
import { createFileRoute } from "@tanstack/react-router";
import { AdminMemberTitanClubView } from "@/components/AdminMemberTitanClub";
import { quoteOrder, DEFAULT_PRICING_SETTINGS, fromCents, type ClubBenefit } from "@/lib/order-pricing";
import type { AdminTitanClub } from "@/lib/titan-club.functions";

export const Route = createFileRoute("/qa-club-stacking")({ component: Fixture });

const member = { userId: "00000000-0000-4000-8000-000000000001", name: "Demo Member (dummy)", email: "demo@example.invalid" };
const data: AdminTitanClub = { installed: true, stackingInstalled: true, enabled: false, siteCapPercent: 20, members: [], events: [] };
const st = { multibuy: true, crypto: false, firstOffer: true, code: false, credit: true };
const draft = { ...member, type: "percent" as const, amount: "25", maxCap: "30", note: "Dummy note", active: true, isNew: true, stacking: { ...st, foundation: false } };
const line = { unitCents: 10000, baseCents: 10000, quantity: 2 };
const club = (foundation: boolean): ClubBenefit => ({ type: "percent", percent: 10, maxCapPercent: 30, stacking: { ...st, foundation } });
const $ = (c: number) => `$${fromCents(c).toFixed(2)}`;

function Cart({ foundation }: { foundation: boolean }) {
  const q = quoteOrder({ lines: [line], shippingMethod: "express", paymentMethod: "payid", foundationPercent: 5, club: club(foundation) }, DEFAULT_PRICING_SETTINGS);
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">
      <p className="font-bold uppercase">Sample cart (dummy) · Foundation stacking {foundation ? "ON" : "OFF"}</p>
      <p className="text-muted-foreground">2 × $100 product · Foundation 5% member · Club 10% / 30% max</p>
      <ul className="mt-2 space-y-1">
        <li>Multi-buy: −{$(q.multibuyCents)}</li>
        <li>Foundation Member: −{$(q.foundationCents)}</li>
        <li>Titan Club: −{$(q.clubCents)}</li>
        <li className="font-bold">Products total: {$(q.merchandiseCents)}</li>
      </ul>
      {q.notices.map((n) => <p key={n} className="mt-1 text-xs text-muted-foreground">{n}</p>)}
    </div>
  );
}

function Fixture() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <p className="rounded bg-secondary p-2 text-center text-xs font-bold uppercase text-secondary-foreground">Dummy data preview — not a real member</p>
      <AdminMemberTitanClubView member={member} data={data} onSave={async () => undefined} initialDraft={draft} />
      <div className="grid gap-4 md:grid-cols-2"><Cart foundation={false} /><Cart foundation={true} /></div>
    </main>
  );
}
