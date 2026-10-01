import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { PageImageBoxes } from "@/components/PageImageBoxes";
import { RichText } from "@/components/RichText";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import {
  BLOCK_ALIGN_CLASS,
  catalogueName,
  contentAlign,
  featuredSlugs,
  FLEX_ALIGN_CLASS,
  HOME_IMAGE_SLOTS,
  HOME_SECTIONS,
  homeValue,
  pageImageSlots,
  pageSectionOrder,
  TEXT_ALIGN_CLASS,
} from "@/lib/homeContent";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/titan-labs-new-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titan Labs Aus | Premium Research Peptides Australia" },
      {
        name: "description",
        content:
          "Titan Labs Aus supplies premium-quality, lab-tested research peptides and wellness compounds with free express shipping on orders over $200.",
      },
      { property: "og:title", content: "Titan Labs Aus | Premium Research Peptides" },
      {
        property: "og:description",
        content:
          "Premium quality, pure form, research use only. Free express shipping on orders over $200.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { products } = useProducts();
  const { data: content } = useSiteContent();

  const slugs = featuredSlugs(content);
  const featured = slugs
    .map((s) => products.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const pictures = pageImageSlots(content, HOME_IMAGE_SLOTS);
  const sectionOrder = pageSectionOrder(content, "home_layout_order", HOME_SECTIONS);

  const pillars = [1, 2, 3].map((n) => ({
    titleKey: `home_pillar${n}_title`,
    bodyKey: `home_pillar${n}_body`,
    title: homeValue(content, `home_pillar${n}_title`),
    body: homeValue(content, `home_pillar${n}_body`),
  }));

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main className="relative">
        <div className="home-logo-field pointer-events-none absolute inset-x-0 top-0 flex h-[34rem] items-center justify-center overflow-hidden" aria-hidden="true">
          <img src={logoAsset.url} alt="" width={768} height={768} className="home-watermark h-full w-full scale-110 object-contain sm:scale-125" />
          
        </div>
        <div className="h-20 sm:h-28" />
        {sectionOrder.map((section) => {
            if (section === "tagline") return <section key={section} className="relative page-shell pb-6"><p className={cn("technical-label text-muted-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "home_tagline")])}><RichText text={homeValue(content, "home_tagline")} /></p></section>;
            if (section === "headline") return <section key={section} className="relative page-shell pb-5"><h1 className={cn("max-w-5xl font-display text-5xl font-black uppercase leading-none tracking-[0.08em] text-foreground sm:text-7xl", TEXT_ALIGN_CLASS[contentAlign(content, "home_headline")])}><RichText text={homeValue(content, "home_headline")} /></h1></section>;
           if (section === "intro") return <section key={section} className="relative page-shell pb-8"><p className={cn("max-w-2xl whitespace-pre-wrap text-base leading-7 text-muted-foreground", BLOCK_ALIGN_CLASS[contentAlign(content, "home_subtext")], TEXT_ALIGN_CLASS[contentAlign(content, "home_subtext")])}><RichText text={homeValue(content, "home_subtext")} /></p></section>;
          if (section === "shipping") return <section key={section} className="relative mx-auto max-w-6xl px-4 pb-8"><div className={cn("flex", FLEX_ALIGN_CLASS[contentAlign(content, "home_shipping_banner")])}><p className="rounded-xl border border-accent/40 bg-accent/10 px-6 py-3 font-display text-sm font-black uppercase tracking-wider text-accent shadow-gold"><RichText text={homeValue(content, "home_shipping_banner")} /></p></div></section>;
           if (section === "range-button") return <section key={section} className="page-shell pb-24"><div className="flex gap-3"><Button asChild size="lg"><Link to="/range">View {catalogueName(content)}</Link></Button><Button asChild size="lg" variant="outline"><Link to="/auth/signup">Create account</Link></Button></div></section>;
          if (section === "pictures") return pictures.length ? <section key={section} className="mx-auto max-w-6xl px-4 pb-16"><PageImageBoxes images={pictures} /></section> : null;
           if (section === "featured") return featured.length ? <section key={section} className="relative border-y border-primary/20 bg-secondary/45 py-16"><div className="mx-auto max-w-6xl px-4"><p className="mb-2 text-[10px] font-bold uppercase text-primary">Selected // Current</p><h2 className={cn("font-display text-3xl font-black uppercase tracking-[0.08em] text-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "home_featured_title")])}><RichText text={homeValue(content, "home_featured_title")} /></h2><p className={cn("mt-3 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground", BLOCK_ALIGN_CLASS[contentAlign(content, "home_featured_note")], TEXT_ALIGN_CLASS[contentAlign(content, "home_featured_note")])}><RichText text={homeValue(content, "home_featured_note")} /></p><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((p) => <ProductCard key={p.slug} product={p} />)}</div></div></section> : null;
          if (section === "pillars") return <section key={section} className="mx-auto max-w-6xl px-4 pb-20"><div className="grid gap-3 sm:grid-cols-3">{pillars.map((p, index) => <div key={p.title} className="rounded-2xl border border-primary/25 border-t-2 border-t-primary bg-card/90 p-6 shadow-glow"><p className="mb-5 text-[10px] font-black text-primary">0{index + 1} //</p><h3 className={cn("text-sm font-bold uppercase text-accent", TEXT_ALIGN_CLASS[contentAlign(content, p.titleKey)])}><RichText text={p.title} /></h3><p className={cn("mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground", TEXT_ALIGN_CLASS[contentAlign(content, p.bodyKey)])}><RichText text={p.body} /></p></div>)}</div></section>;
          if (section === "signup") return <section key={section} className="mx-auto max-w-4xl px-4 pb-24"><div className="rounded-2xl border border-accent/30 border-l-2 border-l-accent bg-card/90 px-6 py-12 shadow-gold"><h2 className={cn("text-steel text-4xl font-extrabold uppercase", TEXT_ALIGN_CLASS[contentAlign(content, "home_cta_title")])}><RichText text={homeValue(content, "home_cta_title")} /></h2><p className={cn("mt-4 max-w-xl whitespace-pre-wrap text-muted-foreground", BLOCK_ALIGN_CLASS[contentAlign(content, "home_cta_body")], TEXT_ALIGN_CLASS[contentAlign(content, "home_cta_body")])}><RichText text={homeValue(content, "home_cta_body")} /></p><div className={cn("mt-8 flex", FLEX_ALIGN_CLASS[contentAlign(content, "home_cta_button")])}><Button asChild size="lg" className="font-bold uppercase"><Link to="/auth/signup">{homeValue(content, "home_cta_button")}</Link></Button></div></div></section>;
          return null;
        })}
      </main>

      <SiteFooter />
    </div>
  );
}
