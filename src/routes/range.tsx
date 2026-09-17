import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
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
  contentAlign,
  RANGE_IMAGE_SLOTS,
  homeValue,
  pageImageSlots,
  TEXT_ALIGN_CLASS,
} from "@/lib/homeContent";
import { productBasePrice } from "@/lib/products";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/range")({
  head: () => ({
    meta: [
      { title: "The Range | Titan Labs Aus Research Peptides" },
      {
        name: "description",
        content:
          "Browse the full Titan Labs Aus range of lab-tested research peptides by category — recovery, metabolic, regenerative, cognitive, longevity, performance and dermal.",
      },
      { property: "og:title", content: "The Range | Titan Labs Aus" },
      {
        property: "og:description",
        content: "Every Titan Labs Aus research peptide, filterable by category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RangePage,
});

function RangePage() {
  const { products } = useProducts();
  const { data: content } = useSiteContent();
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");
  const pictures = pageImageSlots(content, RANGE_IMAGE_SLOTS);

  useEffect(() => setMounted(true), []);

  const term = mounted ? search.trim().toLowerCase() : "";
  const activeCategory = mounted ? category : "All";
  const activeSort = mounted ? sort : "name-asc";
  const matched = products.filter((p) => {
    const inCategory = activeCategory === "All" || (p.categories ?? []).includes(activeCategory);
    if (!inCategory) return false;
    if (!term) return true;
    return [p.name, p.blurb, p.description ?? "", ...(p.categories ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  const visible = [...matched].sort((a, b) => {
    if (activeSort === "price-asc") return productBasePrice(a) - productBasePrice(b);
    if (activeSort === "price-desc") return productBasePrice(b) - productBasePrice(a);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main id="range" className="mx-auto max-w-6xl px-4 pb-20 pt-6">
        <h1 className={cn("text-4xl font-extrabold uppercase tracking-tight text-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "home_range_title")])}>
          <RichText text={homeValue(content, "home_range_title")} />
        </h1>
        {homeValue(content, "range_intro") ? (
          <p className={cn("mt-4 max-w-3xl whitespace-pre-wrap text-base text-muted-foreground sm:text-lg", BLOCK_ALIGN_CLASS[contentAlign(content, "range_intro")], TEXT_ALIGN_CLASS[contentAlign(content, "range_intro")])}>
            <RichText text={homeValue(content, "range_intro")} />
          </p>
        ) : null}

        <div className={cn("mt-6 flex max-w-4xl gap-4 rounded-xl border border-accent/40 bg-card/70 p-5 shadow-gold", BLOCK_ALIGN_CLASS[contentAlign(content, "range_disclaimer")])}>
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
          <p className={cn("whitespace-pre-wrap text-sm leading-6 text-muted-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "range_disclaimer")])}>
            <RichText text={homeValue(content, "range_disclaimer")} />
          </p>
        </div>

        {pictures.length > 0 ? (
          <div className="mt-8">
            <PageImageBoxes images={pictures} />
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <Button
              key={c}
              type="button"
              variant={activeCategory === c ? "default" : "outline"}
              onClick={() => setCategory(c)}
              className="rounded-full px-5 text-xs font-bold uppercase tracking-[0.15em]"
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="sm:flex-1"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground sm:w-56"
          >
            <option value="name-asc">Name: A to Z</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No products match your search — try another word or category.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}

        <p className={cn("mt-8 whitespace-pre-wrap text-sm text-muted-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "home_range_note")])}>
          <RichText text={homeValue(content, "home_range_note")} />
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
