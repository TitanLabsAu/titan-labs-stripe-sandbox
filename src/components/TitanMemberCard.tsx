import { ShieldCheck } from "lucide-react";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";

export function TitanMemberCard({ name, loading = false }: { name: string; loading?: boolean }) {
  const c = cmsValues(useSiteContent().data, "home_membership");
  return <section aria-label="Your Titan membership" className="relative isolate mb-7 overflow-hidden rounded-xl border border-primary/30 bg-[#030f19] p-6 sm:p-10">
    <img src={c.image || "/images/titan-membership-card.webp"} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-right opacity-40 sm:opacity-70" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#030f19] via-[#030f19]/80 to-transparent" />
    <p className="technical-label text-[#d8aa48]">Your Titan membership</p>
    <h2 className="mt-3 font-display text-3xl uppercase text-[#ccecff] sm:text-4xl">Welcome to Titan Labs</h2>
    <div className="mt-6 max-w-sm rounded-xl border border-[#d8aa48]/60 bg-gradient-to-br from-[#102535] via-[#07141f] to-[#030b13] p-6 shadow-[0_12px_36px_#0008]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-lg font-bold tracking-widest text-[#d8aa48]">TITAN LABS // AUS</span>
        <ShieldCheck aria-hidden="true" className="h-7 w-7 shrink-0 text-[#36b9ef]" />
      </div>
      <div className="my-5 h-px bg-gradient-to-r from-[#d8aa48]/70 to-[#36b9ef]/30" />
      <p className="text-xs uppercase tracking-[0.2em] text-[#92a8b8]">Member</p>
      <p className="mt-2 break-words font-display text-2xl text-[#eaf3f8]" aria-live="polite">{loading ? "Loading your membership…" : name || "Titan member"}</p>
    </div>
  </section>;
}
