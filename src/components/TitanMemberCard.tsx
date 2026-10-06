import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";

export function TitanMemberCard({ name, loading = false }: { name: string; loading?: boolean }) {
  const intro = cmsValues(useSiteContent().data, "page_intros");
  const memberName = loading ? "Loading…" : name || "Titan member";
  return <section aria-labelledby="titan-account-heading" className="relative mb-7 overflow-hidden rounded-xl border border-primary/30 bg-[#030f19]">
    <div className="relative aspect-[1.1] overflow-hidden sm:aspect-[16/9]">
      <img src="/images/titan-membership-card.webp" alt="" width={1672} height={941} className="absolute right-0 top-0 h-full w-auto max-w-none sm:w-full" />
      <p aria-label={`Member: ${memberName}`} aria-live="polite" title={memberName}
        className="absolute left-[59%] top-[70.5%] w-[34%] -translate-x-1/2 -translate-y-1/2 rotate-[5deg] truncate text-center font-display text-[clamp(10px,2.4vw,24px)] tracking-wide text-[#ead8ab] sm:left-[73.5%] sm:w-[23%] sm:text-[clamp(10px,1.5vw,24px)]">{memberName}</p>
    </div>
    <div className="relative bg-gradient-to-b from-transparent to-[#030f19] px-6 pb-8 pt-5 sm:absolute sm:inset-y-0 sm:left-0 sm:flex sm:w-[45%] sm:flex-col sm:justify-center sm:bg-none sm:p-8 lg:p-12">
      <p className="technical-label text-[#d8aa48]">{intro.account_eyebrow}</p>
      <h1 id="titan-account-heading" className="mt-3 font-display text-3xl font-bold uppercase leading-none text-[#ccecff] sm:text-4xl lg:text-5xl">{intro.account_title}</h1>
      <p className="mt-5 font-display text-xl text-[#eaf3f8]">Welcome to Titan Labs</p>
      {intro.account_intro ? <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#9bafbc]">{intro.account_intro}</p> : null}
    </div>
  </section>;
}
