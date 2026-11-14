import { cmsValues, fillTokens } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { useEffect, useState } from "react";
import { BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReferralSettings } from "@/lib/useReferralSettings";
import { cn } from "@/lib/utils";

/** Shown to signed-out visitors while the admin offer is on. Text follows saved settings. */
export function FirstOfferBanner({ redirectTo = "/checkout", className, placement = "checkout", includeReferralInvitation = false }: { redirectTo?: string; className?: string; placement?: "home" | "checkout"; includeReferralInvitation?: boolean }) {
  const { settings } = useReferralSettings();
  const c = cmsValues(useSiteContent().data, placement === "home" ? "home_offer" : "checkout_offer");
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
  const showOffer = c.visible && offer.enabled && offer.percent > 0;
  if (signedIn !== false || (!showOffer && !includeReferralInvitation)) return null;
  const q = `?redirect=${encodeURIComponent(redirectTo)}`;
  return (
    <div className={cn("titan-promotion flex flex-wrap items-center gap-3 px-5 py-4 text-sm", className)}>
      <BadgePercent className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        {includeReferralInvitation ? (
          <p className="font-bold text-foreground">JOIN &amp; SAVE</p>
        ) : null}
        {showOffer ? (
          <p className={cn("whitespace-pre-line", includeReferralInvitation ? "mt-1 text-muted-foreground" : "font-bold text-foreground")}>
            {fillTokens(c.text, { percent: offer.percent })}
          </p>
        ) : null}
        {includeReferralInvitation ? (
          <p className="mt-1 text-muted-foreground">Earn referral rewards when friends use your code.</p>
        ) : null}
      </div>
      <span className="flex gap-3 text-xs font-bold uppercase tracking-wide">
        {(c.join_label || includeReferralInvitation) ? <a className="text-accent underline underline-offset-4" href={`/auth/signup${q}`}>{c.join_label || "Join"}</a> : null}
        {(c.login_label || includeReferralInvitation) ? <a className="text-accent underline underline-offset-4" href={`/auth${q}`}>{c.login_label || "Log in"}</a> : null}
      </span>
    </div>
  );
}
