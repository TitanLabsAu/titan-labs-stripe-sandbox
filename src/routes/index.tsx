import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { featuredSlugs, homeValue } from "@/lib/homeContent";

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

  const pillars = [1, 2, 3].map((n) => ({
    title: homeValue(content, `home_pillar${n}_title`),
    body: homeValue(content, `home_pillar${n}_body`),
  }));

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center">
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
        <div className="mt-8">
          <Button asChild size="lg" className="font-bold uppercase tracking-wide">
            <Link to="/range">{homeValue(content, "home_range_button")}</Link>
          </Button>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-center text-3xl font-extrabold uppercase tracking-tight text-foreground">
            {homeValue(content, "home_featured_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            {homeValue(content, "home_featured_note")}
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}

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

      <SiteFooter />
    </div>
  );
}
