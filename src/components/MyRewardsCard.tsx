import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/products";
import { getMyRewards } from "@/lib/referrals.functions";

export function MyRewardsCard() {
  const fetchRewards = useServerFn(getMyRewards);
  const { data } = useQuery({ queryKey: ["my-rewards"], queryFn: () => fetchRewards() });
  if (!data) return null;
  const unit = data.unitCents / 100;
  const referral = data.codes.filter((c) => c.code_kind === "referral" && c.active);
  const member = data.codes.filter((c) => c.code_kind === "member" && c.active && c.times_used < c.max_uses);
  const s = data.summary;

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
        <Gift className="h-5 w-5 text-accent" /> Referrals &amp; store credit
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Available credit", formatPrice(s.availableUnits * unit)],
          ["Paid referrals", String(s.paidReferralOrders)],
          ["Credit used", formatPrice(s.redeemedUnits * unit)],
          ["Held in open orders", formatPrice(s.reservedUnits * unit)],
        ].map(([l, v]) => (
          <div key={l} className="rounded border border-border p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l}</p>
            <p className="text-lg font-extrabold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      {referral.length ? (
        <div className="mt-4 space-y-2">
          {referral.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-primary/40 p-3">
              <span className="text-sm text-muted-foreground">
                Your referral code <strong className="ml-1 text-base uppercase tracking-wide text-foreground">{c.code}</strong>
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(c.code);
                  toast.success("Code copied");
                }}
              >
                <Copy className="mr-1 h-4 w-4" /> Copy
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">You don&apos;t have a referral code yet. Contact us to request one.</p>
      )}
      {member.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Personal reward codes: {member.map((c) => c.code).join(", ")}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Earn {formatPrice(unit)} credit per paid referral order. Use up to {data.maxCreditUnits} credits per order at checkout.{" "}
        <Link to="/referrals" className="text-primary underline">How it works</Link>
      </p>
    </section>
  );
}
