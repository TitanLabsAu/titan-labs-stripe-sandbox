import { useEffect, useState } from "react";
import { BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReferralSettings } from "@/lib/useReferralSettings";
import { cn } from "@/lib/utils";

/** Shown to signed-out visitors while the admin offer is on. Text follows saved settings. */
export function FirstOfferBanner({ redirectTo = "/checkout", className }: { redirectTo?: string; className?: string }) {
  const { settings } = useReferralSettings();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => alive && setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  const offer = settings.firstOffer;
  if (!offer.enabled || !(offer.percent > 0) || signedIn !== false) return null;
  const q = `?redirect=${encodeURIComponent(redirectTo)}`;
  return (
    <div className={cn("flex flex-wrap items-center gap-3 border border-accent/60 bg-accent/10 px-4 py-3 text-sm", className)}>
      <BadgePercent className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1 font-bold text-foreground">
        New members receive {offer.percent}% off their first purchase.
      </p>
      <span className="flex gap-3 text-xs font-bold uppercase tracking-wide">
        <a className="text-accent underline underline-offset-4" href={`/auth/signup${q}`}>Join</a>
        <a className="text-accent underline underline-offset-4" href={`/auth${q}`}>Log in</a>
      </span>
    </div>
  );
}
