import { ArrowRight, FlaskConical, PenTool, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsLink } from "@/components/CmsLink";
import { RichText } from "@/components/RichText";
import { homeValue } from "@/lib/homeContent";
import { canonicalUrl, cmsValues } from "@/lib/storefrontContent";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { filterBySection, CATALOGUE_SECTIONS } from "@/lib/catalogue-sections";

export function DiscoveryWelcome() {
  const { data: content } = useSiteContent();
  const c = cmsValues(content, "home_welcome");
  return (
    <section aria-labelledby="discovery-welcome" className="discovery-welcome relative isolate overflow-hidden">
      <img className="discovery-art" src={c.image || "/images/titan-discovery.webp"} alt="" width={1672} height={941} fetchPriority="high" />
      <div className="discovery-shade absolute inset-0 -z-10" />
      <div className="page-shell discovery-copy relative py-14 sm:py-20 lg:py-28">
        <div className="max-w-xl">
          <p className="discovery-eyebrow mb-5">{c.eyebrow}</p>
          <h1 id="discovery-welcome" className="whitespace-pre-line font-display text-[clamp(2.6rem,5.5vw,5rem)] font-bold uppercase leading-[0.98] tracking-tight text-foreground">{c.headline}</h1>
          <p className="mt-6 max-w-lg whitespace-pre-line text-base leading-7 text-muted-foreground sm:text-lg">{c.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {c.primary_label && canonicalUrl(c.primary_url) ? <Button asChild size="lg" className="min-h-12 px-6 text-sm"><CmsLink href={c.primary_url}>{c.primary_label}<ArrowRight aria-hidden="true" /></CmsLink></Button> : null}
            {c.secondary_label && canonicalUrl(c.secondary_url) ? <Button asChild size="lg" variant="outline" className="min-h-12 border-primary px-6 text-sm"><CmsLink href={c.secondary_url}>{c.secondary_label}<ArrowRight aria-hidden="true" /></CmsLink></Button> : null}
          </div>
          {homeValue(content, "home_shipping_banner") ? <div className="discovery-shipping relative mt-6 flex items-center gap-3 py-3"><Truck aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" /><p className="font-display text-sm font-bold uppercase tracking-wide"><RichText inline text={homeValue(content, "home_shipping_banner")} /></p></div> : null}
          {c.notice ? <p className="mt-6 max-w-lg whitespace-pre-line text-xs leading-5 text-muted-foreground">{c.notice}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function DiscoveryCatalogue() {
  const { data: content } = useSiteContent();
  const { products } = useProducts();
  const c = cmsValues(content, "home_catalogue");
  const labels = cmsValues(content, "product_page");
  const sections = CATALOGUE_SECTIONS.filter(s => filterBySection(products, s).length > 0);
  const icons = { range: FlaskConical, pens: PenTool, equipment: Wrench };
  if (!c.visible || !sections.length) return null;
  return <section aria-labelledby="discovery-catalogue" className="page-shell pb-16 sm:pb-20">
    <p className="discovery-eyebrow mb-3">{c.eyebrow}</p>
    <h2 id="discovery-catalogue" className="font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">{c.title}</h2>
    {c.body ? <p className="mt-3 max-w-xl whitespace-pre-line text-base leading-7 text-muted-foreground">{c.body}</p> : null}
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      {sections.map(s => { const Icon = icons[s]; const photo = filterBySection(products, s).find(p => p.image)?.image; return <CmsLink key={s} href={`/range?section=${s}`} className="discovery-category group relative flex min-h-52 flex-col justify-end overflow-hidden rounded-md border border-primary/40 bg-card p-6 hover:border-accent">
        {photo ? <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-300 group-hover:scale-105" /> : <Icon aria-hidden="true" className="h-9 w-9 text-primary" strokeWidth={1.3} />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030f19] via-transparent to-transparent" />
        <span className="mt-6 flex items-center justify-between gap-3 font-display text-xl font-bold uppercase">{labels[`section_${s}`]}<ArrowRight aria-hidden="true" className="h-5 w-5 text-accent transition-transform group-hover:translate-x-1" /></span>
      </CmsLink>; })}
    </div>
  </section>;
}
