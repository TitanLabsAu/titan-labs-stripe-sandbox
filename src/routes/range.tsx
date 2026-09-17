import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { CATEGORIES } from "@/lib/categories";
import { homeValue } from "@/lib/homeContent";

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
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name-asc");

  const term = search.trim().toLowerCase();
  const matched = products.filter((p) => {
    const inCategory = category === "All" || (p.categories ?? []).includes(category);
    if (!inCategory) return false;
    if (!term) return true;
    return [p.name, p.blurb, p.description ?? "", ...(p.categories ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  const visible = [...matched].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <main id="range" className="mx-auto max-w-6xl px-4 pb-20 pt-6">
        <h1 className="text-center text-4xl font-extrabold uppercase tracking-tight text-foreground">
          {homeValue(content, "home_range_title")}
        </h1>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-[0.15em] transition ${
                category === c
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-accent/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Nothing in this category yet — try another.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {homeValue(content, "home_range_note")}
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
