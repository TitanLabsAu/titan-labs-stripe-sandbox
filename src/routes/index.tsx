import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { formatPrice } from "@/lib/products";
import { useProducts, useSiteContent, useSiteLinks } from "@/lib/useCatalog";
import { CATEGORIES } from "@/lib/categories";
import { homeValue } from "@/lib/homeContent";

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
  const { data: siteLinks } = useSiteLinks();
  const { data: content } = useSiteContent();
  const [category, setCategory] = useState<string>("All");

  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const visible =
    category === "All"
      ? sorted
      : sorted.filter((p) => (p.categories ?? []).includes(category));

  const pillars = [1, 2, 3].map((n) => ({
    title: homeValue(content, `home_pillar${n}_title`),
    body: homeValue(content, `home_pillar${n}_body`),
  }));

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
          {homeValue(content, "home_tagline")}
        </p>
        <h1 className="text-steel mt-5 text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-7xl">
          {homeValue(content, "home_headline")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {homeValue(content, "home_subtext")}
        </p>
        <p className="mx-auto mt-8 inline-block rounded-full border border-accent bg-accent/10 px-6 py-2 text-sm font-extrabold uppercase tracking-[0.15em] text-accent">
          {homeValue(content, "home_shipping_banner")}
        </p>
      </section>

      <section id="range" className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight text-foreground">
          {homeValue(content, "home_range_title")}
        </h2>

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
              <Link
                key={p.slug}
                to="/product/$slug"
                params={{ slug: p.slug }}
                className="block overflow-hidden rounded-xl border border-border bg-card/70 transition-transform hover:-translate-y-1"
              >
                <img
                  src={p.image}
                  alt={p.alt}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex items-center justify-between gap-3 p-5">
                  <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">
                    {p.name}
                  </h3>
                  <span className="text-lg font-extrabold text-accent">{formatPrice(p.price)}</span>
                </div>
                {(p.categories ?? []).length > 0 ? (
                  <p className="px-5 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {(p.categories ?? []).join(" · ")}
                  </p>
                ) : null}
                <p className="px-5 pb-5 text-xs uppercase tracking-[0.2em] text-accent">
                  View &amp; buy →
                </p>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {homeValue(content, "home_range_note")}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-card/60 p-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-accent">
                {p.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
        <div className="shadow-gold rounded-2xl border border-border bg-card/80 px-6 py-12">
          <h2 className="text-steel text-4xl font-extrabold uppercase tracking-tight">
            {homeValue(content, "home_cta_title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {homeValue(content, "home_cta_body")}
          </p>
          <Button asChild size="lg" className="mt-8 font-bold uppercase tracking-wide">
            <Link to="/auth/signup">{homeValue(content, "home_cta_button")}</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <p className="mb-3">
          <Link to="/protocols" className="font-bold text-accent underline underline-offset-4">
            Reconstitution &amp; dosage protocols
          </Link>
        </p>
        {siteLinks && siteLinks.length > 0 ? (
          <p className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {siteLinks.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-accent underline underline-offset-4"
              >
                {l.label}
              </a>
            ))}
          </p>
        ) : null}
        <p>{homeValue(content, "home_footer_text")}</p>
        <p className="mt-2">Research use only. Not for human consumption.</p>
      </footer>
    </div>
  );
}
