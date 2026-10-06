import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getMyRewards } from "@/lib/referrals.functions";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export function MyRewardsCard() {
  const fetchRewards = useServerFn(getMyRewards);
  const { data } = useQuery({ queryKey: ["my-rewards"], queryFn: () => fetchRewards() });
  if (!data) return null;
  const referral = data.codes.filter((c) => c.code_kind === "referral" && c.active);
  const member = data.codes.filter((c) => c.code_kind === "member" && c.active && c.times_used < c.max_uses);
  const s = data.summary;
  const every = data.rewardEvery || s.rewardEvery;
  const progress = s.paidReferralOrders % every;
  const toNext = every - progress;

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold uppercase text-foreground">
        <Gift className="h-5 w-5 text-accent" /> Referral rewards
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Rewards available", `${s.availableUnits} × ${data.rewardPercent}%`],
          ["Paid referrals", String(s.paidReferralOrders)],
          ["Rewards used", String(s.redeemedUnits)],
          ["Held in open orders", String(s.reservedUnits)],
        ].map(([l, v]) => (
          <div key={l} className="rounded border border-border p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l}</p>
            <p className="text-lg font-extrabold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress to next reward</span>
          <span>
            {progress} / {every} — {toNext} more paid referral{toNext === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={every} aria-valuenow={progress}>
          <div className="h-full bg-primary" style={{ width: `${(progress / every) * 100}%` }} />
        </div>
      </div>
      {s.lots.length ? (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {s.lots.map((l, i) => (
            <li key={i}>
              {l.units} × {data.rewardPercent}% off{l.expiresAt ? ` — expires ${fmtDate(l.expiresAt)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
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
        <p className="mt-3 text-sm text-muted-foreground">Personal reward codes: {member.map((c) => c.code).join(", ")}</p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Every {every} paid orders placed with your code (discounted orders count) earns {data.rewardPercent}% off your next purchase.
        Use up to {data.maxCreditUnits} rewards per order, stacking with other discounts to a maximum of {data.capPercent}% off.
        Rewards expire after {data.rewardExpiryDays} days.{" "}
        <Link to="/referrals" className="text-primary underline">How it works</Link>
      </p>
    </section>
  );
}
