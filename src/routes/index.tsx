import { cmsValues } from "@/lib/storefrontContent";
import { FirstOfferBanner } from "@/components/FirstOfferBanner";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { ShieldCheck } from "lucide-react";
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
import { ReviewsStrip } from "@/components/ReviewsStrip";
import logoAsset from "@/assets/titan-labs-new-logo.png.asset.json";
import { TestingTransparencySection } from "@/components/TestingTransparencySection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Titan Labs Aus | Premium Research Peptides Australia" },
      {
        name: "description",
        content:
          "Titan Labs Aus supplies premium-quality, lab-tested research peptides and wellness compounds with free express shipping on orders over $200.",
      },
      {
        property: "og:title",
        content: "Titan Labs Aus | Premium Research Peptides",
      },
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
  const sectionOrder = pageSectionOrder(
    content,
    "home_layout_order",
    HOME_SECTIONS,
  );

  const brand = cmsValues(content, "branding");
  const pillars = [1, 2, 3].map((n) => ({
    titleKey: `home_pillar${n}_title`,
    bodyKey: `home_pillar${n}_body`,
    title: homeValue(content, `home_pillar${n}_title`),
    body: homeValue(content, `home_pillar${n}_body`),
  }));

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main className="titan-home relative">
        {brand.watermark_visible ? (
        <div
          className="home-logo-field pointer-events-none absolute inset-x-0 top-0 flex h-[34rem] items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={brand.watermark || logoAsset.url}
            alt=""
            width={768}
            height={768}
            className="home-watermark h-full w-full scale-110 object-contain sm:scale-125"
          />
        </div>
        ) : null}
        {sectionOrder.map((section) => {
          if (section === "page-heading")
            return (
              <div key={section} className="relative">
                <div className="page-shell pt-8 sm:pt-12">
                  <TitanPageHeading icon={ShieldCheck} eyebrow={brand.home_eyebrow} title={brand.home_title} />
                </div>
                <div className="h-7 sm:h-9" />
              </div>
            );
          if (section === "offer")
            return <div key={section} className="page-shell pt-4"><FirstOfferBanner redirectTo="/range" /></div>;
          if (section === "testing") return <TestingTransparencySection key={section} />;
          if (section === "tagline")
            return (
              <section key={section} className="relative page-shell pb-6">
                <p
                  className={cn(
                    "technical-label text-accent",
                    TEXT_ALIGN_CLASS[contentAlign(content, "home_tagline")],
                  )}
                >
                  <RichText inline text={homeValue(content, "home_tagline")} />
                </p>
              </section>
            );
          if (section === "headline")
            return (
              <section key={section} className="relative page-shell pb-5">
                <h1
                  className={cn(
                    "max-w-5xl font-display text-[clamp(2.65rem,12vw,4.5rem)] font-black uppercase leading-[0.92] tracking-[0.045em] text-foreground sm:text-7xl sm:tracking-[0.08em]",
                    TEXT_ALIGN_CLASS[contentAlign(content, "home_headline")],
                  )}
                >
                  <RichText inline text={homeValue(content, "home_headline")} />
                </h1>
              </section>
            );
          if (section === "intro")
            return (
              <section key={section} className="relative page-shell pb-8">
                <p
                  className={cn(
                    "max-w-2xl whitespace-pre-wrap text-base leading-7 text-muted-foreground",
                    BLOCK_ALIGN_CLASS[contentAlign(content, "home_subtext")],
                    TEXT_ALIGN_CLASS[contentAlign(content, "home_subtext")],
                  )}
                >
                  <RichText inline text={homeValue(content, "home_subtext")} />
                </p>
              </section>
            );
          if (section === "shipping")
            return (
              <section
                key={section}
                className="relative mx-auto max-w-6xl px-4 pb-8"
              >
                <div
                  className={cn(
                    "flex",
                    FLEX_ALIGN_CLASS[
                      contentAlign(content, "home_shipping_banner")
                    ],
                  )}
                >
                  <p className="rounded-xl border border-border bg-card px-6 py-3 font-display text-sm font-black uppercase tracking-wider text-muted-foreground">
                    <RichText
                      inline
                      text={homeValue(content, "home_shipping_banner")}
                    />
                  </p>
                </div>
              </section>
            );
          if (section === "range-button")
            return (
              <section key={section} className="page-shell pb-10">
                <div className="relative flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/range">View {catalogueName(content)}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/auth/signup">Create account</Link>
                  </Button>
                </div>
              </section>
            );
          if (section === "pictures")
            return pictures.length ? (
              <section key={section} className="mx-auto max-w-6xl px-4 pb-16">
                <PageImageBoxes images={pictures} />
              </section>
            ) : null;
          if (section === "featured")
            return featured.length ? (
              <section
                key={section}
                className="relative border-y border-primary/20 bg-secondary/45 py-16"
              >
                <div className="mx-auto max-w-6xl px-4">
                  <p className="mb-2 text-[10px] font-bold uppercase text-primary">
                    Selected // Current
                  </p>
                  <h2
                    className={cn(
                      "font-display text-3xl font-black uppercase tracking-[0.08em] text-foreground",
                      TEXT_ALIGN_CLASS[
                        contentAlign(content, "home_featured_title")
                      ],
                    )}
                  >
                    <RichText
                      inline
                      text={homeValue(content, "home_featured_title")}
                    />
                  </h2>
                  <p
                    className={cn(
                      "mt-3 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground",
                      BLOCK_ALIGN_CLASS[
                        contentAlign(content, "home_featured_note")
                      ],
                      TEXT_ALIGN_CLASS[
                        contentAlign(content, "home_featured_note")
                      ],
                    )}
                  >
                    <RichText
                      inline
                      text={homeValue(content, "home_featured_note")}
                    />
                  </p>
                  <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((p) => (
                      <ProductCard key={p.slug} product={p} />
                    ))}
                  </div>
                </div>
              </section>
            ) : null;
          if (section === "pillars")
            return (
              <div key={section}>
                <section className="mx-auto max-w-6xl px-4 pb-12">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {pillars.map((p, index) => (
                      <div
                        key={p.title}
                        className="rounded-xl border border-border bg-card p-6"
                      >
                        <p className="mb-5 text-[10px] font-black text-primary">
                          0{index + 1} //
                        </p>
                        <h3
                          className={cn(
                            "text-sm font-bold uppercase text-accent",
                            TEXT_ALIGN_CLASS[contentAlign(content, p.titleKey)],
                          )}
                        >
                          <RichText inline text={p.title} />
                        </h3>
                        <p
                          className={cn(
                            "mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground",
                            TEXT_ALIGN_CLASS[contentAlign(content, p.bodyKey)],
                          )}
                        >
                          <RichText inline text={p.body} />
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            );
          if (section === "signup")
            return (
              <section key={section} className="mx-auto max-w-4xl px-4 pb-24">
                <div className="rounded-xl border border-border border-l-2 border-l-primary bg-card px-6 py-8">
                  <h2
                    className={cn(
                      "text-foreground text-4xl font-extrabold uppercase",
                      TEXT_ALIGN_CLASS[contentAlign(content, "home_cta_title")],
                    )}
                  >
                    <RichText
                      inline
                      text={homeValue(content, "home_cta_title")}
                    />
                  </h2>
                  <p
                    className={cn(
                      "mt-4 max-w-xl whitespace-pre-wrap text-muted-foreground",
                      BLOCK_ALIGN_CLASS[contentAlign(content, "home_cta_body")],
                      TEXT_ALIGN_CLASS[contentAlign(content, "home_cta_body")],
                    )}
                  >
                    <RichText
                      inline
                      text={homeValue(content, "home_cta_body")}
                    />
                  </p>
                  <div
                    className={cn(
                      "mt-8 flex",
                      FLEX_ALIGN_CLASS[
                        contentAlign(content, "home_cta_button")
                      ],
                    )}
                  >
                    <Button asChild size="lg" className="font-bold uppercase">
                      <Link to="/auth/signup">
                        {homeValue(content, "home_cta_button")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>
            );
          return null;
        })}
        <ReviewsStrip />
      </main>

      <SiteFooter />
    </div>
  );
}
