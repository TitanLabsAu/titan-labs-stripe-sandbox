import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClubEditor } from "@/components/AdminTitanClub";
import { TitanClubView } from "@/components/TitanClubBadge";
import { FreeShippingMeter, ShippingPicker } from "@/components/CartExtras";
import { newClubDraft } from "@/lib/titan-club-draft";
import type { ShippingMethodKey } from "@/lib/pricing";

export const Route = createFileRoute("/fs-preview")({ component: P, head: () => ({ meta: [{ title: "Preview fixture" }] }) });

function P() {
  const [d, setD] = useState({ ...newClubDraft({ userId: "11111111-1111-1111-1111-111111111111", name: "Demo Member", email: "demo@example.test" }, 20), amount: "25", maxCap: "30", freeShipping: true });
  const [m, setM] = useState<ShippingMethodKey>("express");
  return (
    <div data-testid="fx" className="mx-auto max-w-3xl space-y-6 p-4">
      <p className="text-xs font-bold uppercase text-primary">Dummy data preview — not real members</p>
      <ClubEditor draft={d} siteCap={20} onChange={setD} onSave={() => {}} onCancel={() => {}} />
      <TitanClubView club={{ type: "percent", percent: 25, fixedCents: 0, maxCapPercent: 30, assignedAt: "2026-10-01", freeShipping: true }} />
      <FreeShippingMeter remaining={150} club />
      <ShippingPicker value={m} onChange={setM} freeShipping club />
    </div>
  );
}
