import { ArrowRight } from "lucide-react";
import { ThemedArt, themedArtPair } from "@/components/ThemedImage";
import { Button } from "@/components/ui/button";
import { CmsLink } from "@/components/CmsLink";
import { FirstOfferBanner } from "@/components/FirstOfferBanner";
import { canonicalUrl, cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";

export function TitanMembership() {
  const c = cmsValues(useSiteContent().data, "home_membership");
  const art = themedArtPair(c.image || "/images/titan-membership-card.webp", c.image_light);
  if (!c.visible) return null;
  return <section aria-labelledby="titan-membership-heading" className="titan-membership relative isolate overflow-hidden">
    <ThemedArt dark={art.dark} light={art.light} sizes="100vw" alt="" width={1672} height={941} className="membership-art" />
    <div className="membership-shade" />
    <div className="page-shell relative py-14 sm:py-20 lg:py-24">
      <div className="max-w-xl">
        <p className="discovery-eyebrow mb-5">{c.eyebrow}</p>
        <h2 id="titan-membership-heading" className="font-display text-4xl font-bold uppercase leading-none sm:text-6xl">{c.title}</h2>
        <p className="mt-5 max-w-lg whitespace-pre-line text-base leading-7 text-muted-foreground sm:text-lg">{c.body}</p>
        <FirstOfferBanner placement="home" redirectTo="/range" className="membership-offer mt-7" />
        {c.primary_label && canonicalUrl(c.primary_url) ? <Button asChild size="lg" className="mt-7 min-h-14 w-full px-8 sm:w-auto"><CmsLink href={c.primary_url}>{c.primary_label}<ArrowRight aria-hidden="true" /></CmsLink></Button> : null}
        {c.login_label && canonicalUrl(c.login_url) ? <p className="mt-5 text-sm text-muted-foreground">{c.login_prompt} <CmsLink href={c.login_url} className="text-primary underline underline-offset-4">{c.login_label}</CmsLink></p> : null}
        {c.help ? <p className="mt-8 max-w-lg whitespace-pre-line text-xs leading-5 text-muted-foreground">{c.help}</p> : null}
      </div>
    </div>
  </section>;
}
