import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpNarrowWide, Search, ShieldCheck } from "lucide-react";
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
  RANGE_SECTIONS,
  homeValue,
  pageImageSlots,
  pageSectionOrder,
  TEXT_ALIGN_CLASS,
} from "@/lib/homeContent";
import { productBasePrice } from "@/lib/products";
import { cn } from "@/lib/utils";
import { CatalogueOrderSummary } from "@/components/CatalogueOrderSummary";

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
  const sectionOrder = pageSectionOrder(content, "range_layout_order", RANGE_SECTIONS);

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

      <main id="range" className="page-shell pb-20 pt-10 sm:pt-12">
        {sectionOrder.map((section) => {
           if (section === "title") return <section key={section} className="pb-3"><h1 className={cn("text-3xl font-medium uppercase text-foreground sm:text-4xl", TEXT_ALIGN_CLASS[contentAlign(content, "home_range_title")])}><RichText text={homeValue(content, "home_range_title")} /></h1><p className="mt-2 text-sm text-muted-foreground">All prices displayed in AUD.</p></section>;
          if (section === "intro") return homeValue(content, "range_intro") ? <section key={section} className="pb-6"><p className={cn("max-w-3xl whitespace-pre-wrap text-base text-muted-foreground sm:text-lg", BLOCK_ALIGN_CLASS[contentAlign(content, "range_intro")], TEXT_ALIGN_CLASS[contentAlign(content, "range_intro")])}><RichText text={homeValue(content, "range_intro")} /></p></section> : null;
          if (section === "disclaimer") return <section key={section} className="pb-8"><div className={cn("industrial-panel flex max-w-4xl gap-4 border-l-2 border-l-accent p-5", BLOCK_ALIGN_CLASS[contentAlign(content, "range_disclaimer")])}><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-accent" /><p className={cn("whitespace-pre-wrap text-sm leading-6 text-muted-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "range_disclaimer")])}><RichText text={homeValue(content, "range_disclaimer")} /></p></div></section>;
          if (section === "pictures") return pictures.length ? <section key={section} className="pb-8"><PageImageBoxes images={pictures} /></section> : null;
           if (section === "products") return <section key={section} className="pb-8"><div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name, category or specification..." aria-label="Search products" className="h-11 pl-10" /></label><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="h-11 border border-input bg-background px-3 text-sm text-foreground"><option value="All">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select><div className="grid grid-cols-3 border border-input"><Button type="button" variant={activeSort === "name-asc" ? "default" : "ghost"} onClick={() => setSort("name-asc")} size="sm" aria-label="Sort A to Z"><ArrowDownAZ /> A–Z</Button><Button type="button" variant={activeSort === "price-desc" ? "default" : "ghost"} onClick={() => setSort("price-desc")} size="sm" aria-label="Price high to low"><ArrowDownWideNarrow /><span className="hidden xl:inline">Price high</span></Button><Button type="button" variant={activeSort === "price-asc" ? "default" : "ghost"} onClick={() => setSort("price-asc")} size="sm" aria-label="Price low to high"><ArrowUpNarrowWide /><span className="hidden xl:inline">Price low</span></Button></div></div><div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]"><div><p className="technical-label mb-4 text-muted-foreground">{visible.length} products</p>{visible.length === 0 ? <p className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">No products match your search — try another word or category.</p> : <div className="grid gap-3 md:grid-cols-2">{visible.map((p) => <ProductCard key={p.slug} product={p} />)}</div>}</div><CatalogueOrderSummary /></div></section>;
          if (section === "note") return <section key={section}><p className={cn("whitespace-pre-wrap text-sm text-muted-foreground", TEXT_ALIGN_CLASS[contentAlign(content, "home_range_note")])}><RichText text={homeValue(content, "home_range_note")} /></p></section>;
          return null;
        })}
      </main>

      <SiteFooter />
    </div>
  );
}
