import { FirstOfferBanner } from "@/components/FirstOfferBanner";
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
import { DiscoveryWelcome, DiscoveryCatalogue } from "@/components/DiscoveryWelcome";
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

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main className="titan-home relative">
        <DiscoveryWelcome />
        {sectionOrder.map((section) => {
          if (section === "offer")
            return <div key={section} className="page-shell pb-12"><FirstOfferBanner redirectTo="/range" placement="home" /></div>;
          if (section === "catalogue-links") return <DiscoveryCatalogue key={section} />;
          if (section === "testing") return <TestingTransparencySection key={section} />;
          if (section === "reviews") return <ReviewsStrip key={section} />;
          if (section === "shipping" || section === "pillars") return null;
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
      </main>

      <SiteFooter />
    </div>
  );
}
