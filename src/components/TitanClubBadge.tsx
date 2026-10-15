import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown } from "lucide-react";
import { getMyTitanClub, type ClubBenefitView, type MyTitanClub } from "@/lib/titan-club.functions";

export function clubBenefitText(b: Pick<ClubBenefitView, "type" | "percent" | "fixedCents">) {
  return b.type === "fixed" ? `$${(b.fixedCents / 100).toFixed(2)} off` : `${b.percent}% off`;
}

/** Member Account card: actual assigned benefit and personal maximum. */
export function TitanClubView({ club }: { club: NonNullable<MyTitanClub> }) {
  return (
    <section aria-label="The Titan Club" className="titan-club-badge mb-7 flex items-center gap-4 rounded-xl border-2 border-primary bg-card p-5">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Crown className="h-7 w-7" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
          The Titan Club <span className="text-primary">· {clubBenefitText(club)} every purchase</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Club benefit is permanent while your membership is active and is applied automatically at checkout to
          products (not shipping). Extra checkout savings that combine with your Club benefit are capped at your personal maximum of {club.maxCapPercent}% of products. Range kit prices
          already include their built-in saving — you keep that lower kit price in full, so your Club saving may be
          reduced on orders that already have other discounts. Foundation Member savings don't combine with Titan Club; checkout
          automatically uses whichever gives you the lower total.
        </p>
      </div>
    </section>
  );
}

export function TitanClubBadge() {
  const fetchIt = useServerFn(getMyTitanClub);
  const { data } = useQuery({ queryKey: ["my-titan-club"], queryFn: () => fetchIt() });
  return data ? <TitanClubView club={data} /> : null;
}

/** Small Titan Blue pill for Admin lists. */
export function TitanClubPill({ label = "Titan Club" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
      <Crown className="h-3 w-3" aria-hidden="true" /> {label}
    </span>
  );
}
