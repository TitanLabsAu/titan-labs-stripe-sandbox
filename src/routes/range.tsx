import { ChristmasCatalogueWreath } from "@/components/christmas/ChristmasTheme";
import { loadCatalogProducts } from "@/lib/useCatalog";
import { ThemedArt } from "@/components/ThemedImage";
import { hotVariantIds, withHotSelections } from "@/lib/product-promotions";
import { SITE_ORIGIN } from "@/lib/seo";
import { cmsValues } from "@/lib/storefrontContent";
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { PageImageBoxes } from "@/components/PageImageBoxes";
import { RichText } from "@/components/RichText";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { CATEGORIES } from "@/lib/categories";
import {
  BLOCK_ALIGN_CLASS,
  catalogueName,
  featuredSlugs,
  contentAlign,
  RANGE_IMAGE_SLOTS,
  RANGE_SECTIONS,
  homeValue,
  pageImageSlots,
  pageSectionOrder,
  TEXT_ALIGN_CLASS,
} from "@/lib/homeContent";
import { productBasePrice } from "@/lib/products";
import { cn } from "@/lib/utils";
import {
  CATALOGUE_SECTIONS,
  CATALOGUE_SECTION_LABELS,
  filterBySection,
  isCatalogueSection,
  resolveCatalogueSection,
  type CatalogueSection,
} from "@/lib/catalogue-sections";

import { TestingTransparencyBanner } from "@/components/TestingTransparencyBanner";

export const Route = createFileRoute("/range")({
  loader: ({ context }) => loadCatalogProducts(context.queryClient),
  validateSearch: (search: Record<string, unknown>) => ({
    ...(isCatalogueSection(search["section"])
      ? { section: search["section"] }
      : {}),
  }),
  head: () => ({ links: [{rel:"canonical",href:`${SITE_ORIGIN}/range`}],
    meta: [
      { title: "Catalogue | Titan Labs Aus Research Peptides" },
      {
        name: "description",
        content:
          "Browse the full Titan Labs Aus catalogue of lab-tested research peptides by category — recovery, metabolic, regenerative, cognitive, longevity, performance and dermal.",
      },
      { property: "og:title", content: "Catalogue | Titan Labs Aus" },
      {
        property: "og:description",
        content:
          "Every Titan Labs Aus research peptide, filterable by category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RangePage,
});

function RangePage() {
  const routeSearch = Route.useSearch();
  const navigate = useNavigate({ from: "/range" });
  const { products, isLoading: productsLoading } = useProducts();
  const { data: content } = useSiteContent();
  const pp = cmsValues(content, "product_page");
  const banner = cmsValues(content, "catalogue_banner");
  const bannerImage = banner.image || "/images/titan-catalogue-banner.webp";
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const pictures = pageImageSlots(content, RANGE_IMAGE_SLOTS);
  const configuredSections = pageSectionOrder(
    content,
    "range_layout_order",
    RANGE_SECTIONS,
  );
  // Keep the notice visible beside discovery without making it the opening hero.
  const sectionOrder = configuredSections.filter(
    (section) => !["disclaimer", "intro", "title"].includes(section),
  );
  sectionOrder.splice(sectionOrder.indexOf("products") + 1, 0, ...configuredSections.filter(s => ["title", "intro"].includes(s)), "disclaimer");

  useEffect(() => setMounted(true), []);

  // Only sections with at least one publicly visible product get a tab.
  const availableSections = CATALOGUE_SECTIONS.filter(
    (s) => filterBySection(products, s).length > 0,
  );
  const requestedSection = mounted ? routeSearch.section : "range";
  const activeSection =
    productsLoading && isCatalogueSection(requestedSection)
      ? requestedSection
      : resolveCatalogueSection(requestedSection, availableSections);
  const sectionProducts = filterBySection(products, activeSection);
  const availableCategories = CATEGORIES.filter((c) =>
    sectionProducts.some((p) => (p.categories ?? []).includes(c)),
  );
  const categoryValid = category === "All" || (availableCategories as string[]).includes(category);

  useEffect(() => {
    if (mounted && !productsLoading && routeSearch.section !== activeSection) {
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, section: activeSection }),
      });
    }
  }, [activeSection, mounted, navigate, productsLoading, routeSearch.section]);
  useEffect(() => {
    if (!categoryValid) setCategory("All");
  }, [categoryValid]);

  const term = mounted ? search.trim().toLowerCase() : "";
  const activeCategory = mounted && categoryValid ? category : "All";
  const activeSort = mounted ? sort : "name-asc";
  const matched = sectionProducts.filter((p) => {
    const inCategory =
      activeCategory === "All" || (p.categories ?? []).includes(activeCategory);
    if (!inCategory) return false;
    if (!term) return true;
    return [p.name, p.blurb, p.description ?? "", ...(p.categories ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  const hotSlugs = new Set(featuredSlugs(content));
  const isHot = (p: typeof matched[number]) => (p.variants ?? []).length ? hotVariantIds(p, [...hotSlugs]).length > 0 : hotSlugs.has(p.slug) || /^hot\s*products?$/i.test(p.promoLabel?.trim() ?? "");
  const visible = [...matched].sort((a, b) => {
    if (activeSection === "range") {
      const priority = Number(isHot(b)) - Number(isHot(a));
      if (priority) return priority;
    }
    if (activeSort === "price-asc")
      return productBasePrice(a) - productBasePrice(b);
    if (activeSort === "price-desc")
      return productBasePrice(b) - productBasePrice(a);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main id="range" className="page-shell pb-32 pt-8 sm:pt-12">
        <section aria-labelledby="catalogue-banner-heading" className="catalogue-banner relative isolate overflow-hidden rounded-lg border border-primary/35 bg-card p-5 sm:p-7">
          <ThemedArt tone={false} dark={bannerImage} light="/images/guides-navy-gold/guide-banner-light.webp" sizes="(min-width: 1280px) 1200px, 100vw" alt="" priority className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
          <ChristmasCatalogueWreath />
          <div className="w-fit max-w-full rounded-md bg-card/95 p-4">
            <p className="font-display text-sm font-bold uppercase tracking-[.2em] text-accent">{banner.eyebrow}</p>
          <h1 id="catalogue-banner-heading" className="font-display mt-2 text-[clamp(2.25rem,6vw,4.5rem)] font-bold uppercase leading-none text-foreground">{catalogueName(content)}</h1>
          </div>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                {availableSections.length > 0 && (
                <div
                  role="tablist"
                  aria-label="Catalogue sections"
                  className={cn(
                    "catalogue-banner-tabs flex flex-wrap gap-2 rounded-md bg-card/95 px-2 sm:gap-5",
                    availableSections.length === 1 && "grid-cols-1 max-w-[12rem]",
                    availableSections.length === 2 && "grid-cols-2 sm:max-w-sm",
                    availableSections.length >= 3 && "grid-cols-3 sm:max-w-xl",
                  )}
                >
                  {availableSections.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="tab"
                      aria-selected={activeSection === s}
                      onClick={() => {
                        setCategory("All");
                        void navigate({
                          search: (previous) => ({ ...previous, section: s }),
                        });
                      }}
                      className={cn(
                        "h-11 border-b-2 border-transparent bg-transparent px-2 font-display text-sm font-bold uppercase tracking-wide transition-colors",
                        activeSection === s
                          ? "border-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {pp[`section_${s}`]}
                    </button>
                  ))}
                </div>
                )}

                  <label className="catalogue-banner-search relative block w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={banner.search_placeholder}
                      aria-label="Search products"
                      className="h-11 rounded-full border-primary/60 bg-[#030f19]/90 pl-10"
                    />
                  </label>

          </div>
        </section>
        {sectionOrder.map((section) => {
          if (section === "title")
            return (
              <section key={section} className="py-3">
                <p className="mt-3 text-sm text-muted-foreground">
                  All prices displayed in AUD.
                </p>
              </section>
            );
          if (section === "intro")
            return homeValue(content, "range_intro") ? (
              <section key={section} className="py-5">
                <p
                  className={cn(
                    "max-w-3xl whitespace-pre-wrap text-base text-muted-foreground sm:text-lg",
                    BLOCK_ALIGN_CLASS[contentAlign(content, "range_intro")],
                    TEXT_ALIGN_CLASS[contentAlign(content, "range_intro")],
                  )}
                >
                  <RichText inline text={homeValue(content, "range_intro")} />
                </p>
              </section>
            ) : null;
          if (section === "disclaimer")
            return (
              <section key={section} className="py-5">
                <div
                  className={cn(
                    "flex max-w-4xl gap-3 rounded-xl border border-border bg-card p-4",
                    BLOCK_ALIGN_CLASS[
                      contentAlign(content, "range_disclaimer")
                    ],
                  )}
                >
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p
                    className={cn(
                      "whitespace-pre-wrap text-sm leading-6 text-muted-foreground",
                      TEXT_ALIGN_CLASS[
                        contentAlign(content, "range_disclaimer")
                      ],
                    )}
                  >
                    <RichText
                      inline
                      text={homeValue(content, "range_disclaimer")}
                    />
                  </p>
                </div>
              </section>
            );
          if (section === "pictures")
            return pictures.length ? (
              <section key={section} className="pb-8">
                <PageImageBoxes images={pictures} />
              </section>
            ) : null;
          if (section === "products")
            return (
              <section key={section} className="py-5">
                <details className="mb-4 text-sm text-muted-foreground"><summary className="cursor-pointer font-display uppercase tracking-wide text-accent">Filters and sorting</summary>
                <div className="mt-3 grid gap-3 lg:grid-cols-[13rem_auto]">
                  <select
                    value={activeCategory}
                    onChange={(e) => setCategory(e.target.value)}
                    aria-label="Filter by category"
                    className="h-11 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                  >
                    <option value="All">All categories</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="grid h-11 grid-cols-3 overflow-hidden rounded-xl border border-input bg-card divide-x divide-input">
                    {(
                      [
                        ["name-asc", ArrowDownAZ, "A–Z", "Sort A to Z"],
                        [
                          "price-desc",
                          ArrowDownWideNarrow,
                          "Price high",
                          "Price high to low",
                        ],
                        [
                          "price-asc",
                          ArrowUpNarrowWide,
                          "Price low",
                          "Price low to high",
                        ],
                      ] as const
                    ).map(([key, Icon, label, aria]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSort(key)}
                        aria-label={aria}
                        aria-pressed={activeSort === key}
                        className={cn(
                          "flex h-full items-center justify-center gap-1.5 px-2 text-[0.7rem] font-medium uppercase tracking-[0.12em] transition-colors",
                          activeSort === key
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                </details>
                <div className="mt-4">
                  <div>
                    <p className="technical-label mb-4 text-muted-foreground">
                      {visible.length} products
                    </p>
                    {visible.length === 0 ? (
                      <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                        {products.length === 0
                          ? "No products are available yet — check back soon."
                          : "No products match your search — try another word or category."}
                      </p>
                    ) : (
                      <div className="titan-row-aligned grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {visible.map((p) => (
                          <ProductCard key={p.slug} product={withHotSelections(p, [...hotSlugs])} aligned />
                        ))}
                      </div>
                    )}
                  </div>

                </div>
                <TestingTransparencyBanner placement="catalogue" compact className="mt-8" />
              </section>
            );
          if (section === "note")
            return (
              <section key={section}>
                <p
                  className={cn(
                    "whitespace-pre-wrap text-sm text-muted-foreground",
                    TEXT_ALIGN_CLASS[contentAlign(content, "home_range_note")],
                  )}
                >
                  <RichText
                    inline
                    text={homeValue(content, "home_range_note")}
                  />
                </p>
              </section>
            );
          return null;
        })}
      </main>

      <SiteFooter />
    </div>
  );
}

