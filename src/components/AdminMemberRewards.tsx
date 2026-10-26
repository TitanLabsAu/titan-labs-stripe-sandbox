import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminDiscounts } from "@/components/AdminDiscounts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { adminListDiscountCodes, type AdminDiscountCode } from "@/lib/admin.functions";
import { adminAdjustCredit, adminGetMemberRewards, adminSaveCode } from "@/lib/referrals.functions";

const KIND_LABEL: Record<string, string> = {
  referral_earned: "Reward earned",
  referral_reversed: "Reward reversed",
  redeemed: "Redeemed at checkout",
  redemption_reversed: "Reward returned",
  adjustment: "Admin adjustment",
};

export function AdminMemberRewards({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["admin-member-rewards", userId];
  const { data } = useQuery({ queryKey: key, queryFn: () => adminGetMemberRewards({ data: { userId } }) });
  const { data: allCodes } = useQuery({ queryKey: ["admin-discounts"], queryFn: () => adminListDiscountCodes({}) });
  const [units, setUnits] = useState("1");
  const [reason, setReason] = useState("");
  const [assignId, setAssignId] = useState("");
  const [editingCode, setEditingCode] = useState<AdminDiscountCode | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ["admin-discounts"] });
    void qc.invalidateQueries({ queryKey: ["my-rewards"] });
  };

  const adjust = useMutation({
    mutationFn: () => adminAdjustCredit({ data: { userId, units: Number(units), reason } }),
    onSuccess: () => {
      toast.success("Rewards adjusted");
      setReason("");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not adjust credit"),
  });

  const relink = useMutation({
    mutationFn: (input: { code: any; userId: string | null }) => {
      const c = input.code;
      return adminSaveCode({
        data: {
          id: c.id,
          code: c.code,
          code_kind: c.code_kind,
          discount_type: c.discount_type,
          value: Number(c.value),
          maxUses: c.max_uses >= 1000000 ? null : c.max_uses,
          expiresAtISO: c.expires_at,
          expiresAt: c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" }) : null,
          userId: input.userId,
          note: c.note,
          min_spend: (c.min_spend_cents ?? 0) / 100,
          combine_multibuy: c.combine_multibuy,
          combine_crypto: c.combine_crypto,
          combine_credit: c.combine_credit,
        },
      });
    },
    onSuccess: () => {
      toast.success("Code link updated — past orders keep their original referrer");
      setAssignId("");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update the code"),
  });

  if (!data) return <p className="text-sm text-muted-foreground">Loading rewards…</p>;
  const s = data.summary;
  const unassigned = (allCodes ?? []).filter((c) => c.code_kind === "referral" && !c.user_id);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <Dialog open={Boolean(editingCode)} onOpenChange={open => { if (!open) setEditingCode(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogTitle>Edit member code</DialogTitle>{editingCode ? <AdminDiscounts key={editingCode.id} initialCode={editingCode} editorOnly onDone={() => {setEditingCode(null); refresh();}} /> : null}</DialogContent></Dialog>
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Gift className="h-4 w-4 text-accent" /> Referral rewards
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Paid referral orders", String(s.paidReferralOrders)],
          ["Earned", `${s.earnedUnits} × 10%`],
          ["Redeemed", `${s.redeemedUnits}`],
          ["Reserved", `${s.reservedUnits}`],
          ["Available", `${s.availableUnits}`],
        ].map(([l, v]) => (
          <div key={l} className="rounded border border-border p-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l}</p>
            <p className="font-extrabold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Next reward in {s.rewardEvery - (s.paidReferralOrders % s.rewardEvery)} paid referral(s).
        {s.lots.length ? ` Unused: ${s.lots.map((l) => `${l.units}${l.expiresAt ? ` until ${new Date(l.expiresAt).toLocaleDateString("en-AU")}` : ""}`).join(", ")}.` : ""}
      </p>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-foreground">Codes linked to this member</p>
        {data.codes.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {data.codes.map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong className="uppercase">{c.code}</strong> · {c.code_kind === "member" ? "member-only" : "referral"} · {c.times_used} paid uses
                  {c.active ? "" : " · disabled"}
                </span>
                <Button type="button" size="sm" variant="outline" aria-label={`Edit ${c.code}`} onClick={() => setEditingCode(c)}><Pencil className="h-4 w-4" /> Edit code</Button>
                {c.code_kind === "referral" ? (
                  <Button size="sm" variant="outline" onClick={() => relink.mutate({ code: c, userId: null })}>
                    Unlink
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <select
            aria-label="Link an unassigned referral code"
            className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            value={assignId}
            onChange={(e) => setAssignId(e.target.value)}
          >
            <option value="">Link an unassigned referral code…</option>
            {unassigned.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!assignId || relink.isPending}
            onClick={() => relink.mutate({ code: unassigned.find((c) => c.id === assignId), userId })}
          >
            Link
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="adj-units">Rewards (±)</Label>
          <Input id="adj-units" type="number" value={units} onChange={(e) => setUnits(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="adj-reason">Reason (giveaway, correction…)</Label>
          <Input id="adj-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button disabled={adjust.isPending || reason.trim().length < 3} onClick={() => adjust.mutate()}>
          Adjust rewards
        </Button>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-foreground">History</p>
        {data.ledger.length === 0 && data.codeEvents.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-xs text-muted-foreground">
            {data.ledger.map((e: any) => (
              <li key={e.id}>
                {new Date(e.created_at).toLocaleString("en-AU")} · {KIND_LABEL[e.kind] ?? e.kind} ·{" "}
                <strong className={e.units > 0 ? "text-accent" : "text-foreground"}>
                  {e.units > 0 ? "+" : ""}
                  {e.units}
                </strong>
                {e.reason ? ` · ${e.reason}` : ""}
              </li>
            ))}
            {data.codeEvents.map((e: any) => (
              <li key={e.id}>
                {new Date(e.created_at).toLocaleString("en-AU")} · Code {e.code} {e.action}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
