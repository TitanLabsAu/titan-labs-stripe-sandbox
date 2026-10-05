import { HotProductsStrip } from "@/components/HotProductsStrip";
import { TitanMembership } from "@/components/TitanMembership";
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
          if (section === "featured") return <HotProductsStrip key={section} products={featured} content={content} />;
          if (section === "signup") return <TitanMembership key={section} />;
          return null;
        })}
      </main>

      <SiteFooter />
    </div>
  );
}
