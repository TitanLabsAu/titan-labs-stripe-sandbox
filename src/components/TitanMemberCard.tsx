import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { getMyRewards } from "@/lib/referrals.functions";

export function TitanMemberCard({ name, loading = false }: { name: string; loading?: boolean }) {
  const intro = cmsValues(useSiteContent().data, "page_intros");
  const memberName = loading ? "Loading…" : name || "Titan member";

  const fetchRewards = useServerFn(getMyRewards);
  const { data: rewards } = useQuery({ queryKey: ["my-rewards"], queryFn: () => fetchRewards() });
  const referralCode = rewards?.codes.find((c) => c.code_kind === "referral" && c.active)?.code ?? null;

  return <section aria-labelledby="titan-account-heading" className="relative mb-7 overflow-hidden rounded-xl border border-primary/30 bg-[#030f19]">
    <div className="relative aspect-[1.1] overflow-hidden sm:aspect-[16/9]">
      <img src="/images/titan-membership-card-v2.png" alt="" width={1672} height={941} className="absolute right-0 top-0 h-full w-auto max-w-none sm:w-full" />
      <div className="absolute left-[56.5%] top-[61%] flex w-[36%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[0.35em] text-center sm:left-[73.5%] sm:w-[26%]">
        <p aria-hidden="true" className="whitespace-nowrap font-display font-semibold uppercase leading-none tracking-[0.28em] text-[#d9c39a] text-[clamp(8px,1.7vw,18px)] sm:text-[clamp(8px,1.05vw,18px)]">
          Titan Labs <span className="text-[#d8aa48]">// Aus</span>
        </p>
        <p aria-label={`Member: ${memberName}`} aria-live="polite" title={memberName}
          className="w-full truncate font-display font-bold uppercase leading-tight tracking-wide text-[#ead8ab] text-[clamp(11px,2.3vw,26px)] sm:text-[clamp(11px,1.5vw,26px)]">{memberName}</p>
        {referralCode ? (
          <p className="flex items-center justify-center gap-1.5 whitespace-nowrap leading-none text-[#cfe3f2] text-[clamp(7px,1.3vw,14px)] sm:text-[clamp(7px,0.85vw,14px)]">
            <span className="uppercase tracking-[0.18em]">Referral Code: <span className="font-bold text-[#ead8ab]">{referralCode}</span></span>
            <button
              type="button"
              aria-label="Copy referral code"
              title="Copy referral code"
              className="inline-flex h-[1.7em] w-[1.7em] items-center justify-center rounded-full border border-[#d8aa48]/50 text-[#d8aa48] transition-colors hover:bg-[#d8aa48]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8aa48]"
              onClick={() => {
                void navigator.clipboard?.writeText(referralCode);
                toast.success("Referral code copied");
              }}
            >
              <Copy className="h-[0.9em] w-[0.9em]" aria-hidden="true" />
            </button>
          </p>
        ) : null}
      </div>
    </div>
    <div className="relative bg-gradient-to-b from-transparent to-[#030f19] px-6 pb-8 pt-5 sm:absolute sm:inset-y-0 sm:left-0 sm:flex sm:w-[45%] sm:flex-col sm:justify-center sm:bg-none sm:p-8 lg:p-12">
      <p className="technical-label text-[#d8aa48]">{intro.account_eyebrow}</p>
      <h1 id="titan-account-heading" className="mt-3 font-display text-3xl font-bold uppercase leading-none text-[#ccecff] sm:text-4xl lg:text-5xl">{intro.account_title}</h1>
      <p className="mt-5 font-display text-xl text-[#eaf3f8]">Welcome to Titan Labs</p>
      {intro.account_intro ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#9bafbc]">{intro.account_intro}</p> : null}
    </div>
  </section>;
}
