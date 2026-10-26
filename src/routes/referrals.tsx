import { SITE_ORIGIN } from "@/lib/seo";
import { cmsValues, fillTokens } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LegalPage } from "@/components/LegalPage";
import { getReferralSettings } from "@/lib/referrals.functions";
import { settingsFromRow } from "@/lib/order-pricing";

export const Route = createFileRoute("/referrals")({
  head: () => ({ links: [{rel:"canonical",href:`${SITE_ORIGIN}/referrals`}],
    meta: [
      { title: "Referral Program | Titan Labs Australia" },
      { name: "description", content: "How Titan Labs Australia referral codes and 10% referral rewards work." },
      { property: "og:title", content: "Referral Program | Titan Labs Australia" },
      { property: "og:description", content: "Share your code — every 5 paid referral orders earns 10% off your next purchase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { data } = useQuery({ queryKey: ["referral-settings"], queryFn: () => getReferralSettings() });
  const s = settingsFromRow(data);
  const c = cmsValues(useSiteContent().data, "page_referrals");
  const tokens = { reward: `${s.rewardPercent}%`, every: s.rewardEvery, expiry_days: s.rewardExpiryDays, max_credits: s.maxCreditUnits, max_credit_value: `${s.rewardPercent * s.maxCreditUnits}%`, cap: `${s.combinedCapPercent}%` };
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
          <li>A referral code can be used once per person — on their first successful order. Signing in or joining is required to redeem one; guest checkout stays available without a code.</li>
          <li>Referral rewards, multi-buy, kit and crypto savings stack up to a {s.combinedCapPercent}% maximum off a single purchase.</li>
          <li>Every friend's first paid order placed with your code counts towards your next reward, including discounted orders.</li>
          <li>Each {s.rewardPercent}% reward expires {s.rewardExpiryDays} days after it's earned.</li>
          <li>We may adjust or end the program; credit already earned stays on your account.</li>
        </ul>
        <p className="mt-3">
          See your code, progress and rewards in <Link to="/account" className="text-primary underline">My Profile</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
