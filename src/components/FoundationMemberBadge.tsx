import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Star } from "lucide-react";
import { getMyFoundation } from "@/lib/foundation.functions";

type Data = Awaited<ReturnType<typeof getMyFoundation>>;

export function FoundationMemberView({ data }: { data: Data }) {
  const { award, status } = data;
  if (award) {
    return (
      <section aria-label="Foundation Member" className="foundation-badge mb-7 flex items-center gap-4 rounded-xl border border-primary/50 bg-card p-5">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          <Star className="absolute -right-1 -top-1 h-5 w-5 fill-primary text-primary-foreground" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
            Foundation Member <span className="text-primary">#{String(award.memberNumber).padStart(2, "0")} of {status.capacity}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanent {status.benefitPercent}% member benefit · Combined savings capped at 20%
          </p>
        </div>
      </section>
    );
  }
  // Only describe the programme once it has launched, enrolment is open and places remain.
  if (!status.launched || !status.enrolmentEnabled || status.awarded >= status.capacity) return null;
  return (
    <section aria-label="Foundation Member programme" className="mb-7 flex items-start gap-3 rounded-xl border border-border bg-card p-5">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Foundation Member places remain.</strong> Your next paid order can make you
        one of our first {status.capacity} Foundation Members, with a permanent {status.benefitPercent}% benefit on later
        purchases (combined savings capped at 20%). The qualifying order itself isn't discounted.
      </p>
    </section>
  );
}

export function FoundationMemberBadge() {
  const fetchIt = useServerFn(getMyFoundation);
  const { data } = useQuery({ queryKey: ["my-foundation"], queryFn: () => fetchIt() });
  return data ? <FoundationMemberView data={data} /> : null;
}
