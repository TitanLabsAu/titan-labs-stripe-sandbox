import { cmsValues, fillTokens } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LegalPage } from "@/components/LegalPage";
import { getReferralSettings } from "@/lib/referrals.functions";
import { settingsFromRow } from "@/lib/order-pricing";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    meta: [
      { title: "Referral Program | Titan Labs Australia" },
      { name: "description", content: "How Titan Labs Australia referral codes, store credit and milestone rewards work." },
      { property: "og:title", content: "Referral Program | Titan Labs Australia" },
      { property: "og:description", content: "Share your code, earn store credit on every paid referral order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { data } = useQuery({ queryKey: ["referral-settings"], queryFn: () => getReferralSettings() });
  const s = settingsFromRow(data);
  const unit = formatPrice((s.creditUnitCents * s.referralRewardUnits) / 100);
  const c = cmsValues(useSiteContent().data, "page_referrals");
  const tokens = { reward: unit, max_credits: s.maxCreditUnits, max_credit_value: formatPrice((s.creditUnitCents * s.maxCreditUnits) / 100), cap: `${s.combinedCapPercent}%` };
  const steps = (c.steps as { title: string; body: string }[]).map((st) => [fillTokens(st.title, tokens), fillTokens(st.body, tokens)]);
  return (
    <LegalPage eyebrow="Members" title={c.title}>
      {c.intro ? <p className="mb-5 whitespace-pre-wrap text-sm text-muted-foreground">{fillTokens(c.intro, tokens)}</p> : null}
      <ol className="space-y-4">
        {steps.map(([h, b], i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Step {i + 1}</p>
            <h2 className="mt-1 text-lg font-extrabold uppercase text-foreground">{h}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </li>
        ))}
      </ol>
      <section className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <h2 className="text-lg font-extrabold uppercase text-foreground">Fine print</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>You can't use your own referral code.</li>
          <li>Multi-buy, kit and crypto savings are combined up to a {s.combinedCapPercent}% maximum.</li>
          {s.milestoneThresholds.length ? (
            <li>We recognise referrers reaching {s.milestoneThresholds.join(", ")} paid referral orders.</li>
          ) : null}
          <li>We may adjust or end the program; credit already earned stays on your account.</li>
        </ul>
        <p className="mt-3">
          See your code and balance in <Link to="/account" className="text-primary underline">My Profile</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
