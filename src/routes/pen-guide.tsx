import { cmsValues } from "@/lib/storefrontContent";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PenTool, RotateCcw, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { safeUrl } from "@/lib/research";
export const Route = createFileRoute("/pen-guide")({
  head: () => ({ meta: [{ title: "Titan V2 & Disposable Pen Guides | Titan Labs Aus" }] }),
  component: PenGuide,
});

function PenGuide() {
  const { products } = useProducts();
  const content = useSiteContent().data;
  const g = cmsValues(content, "guide_pages");
  const d = cmsValues(content, "guide_pen");
  const toPairs = (l: { title: string; body: string }[]) => l.map((x) => [x.title, x.body] as const);
  const guides = products.filter(
    (p) => p.catalogueSection === "pens" || /\bv2\b.*pen|pen.*\bv2\b/i.test(p.name),
  );
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <section aria-labelledby="pen-guide-heading" className="catalogue-banner relative isolate overflow-hidden rounded-lg border border-primary/35 p-6 sm:p-8">
          <img src={g.banner_image || "/images/titan-catalogue-banner.webp"} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#030f19]/95 via-[#030f19]/65 to-[#030f19]/10" />
          <p className="font-display text-sm uppercase tracking-[.2em] text-accent">{g.eyebrow}</p>
          <h1 id="pen-guide-heading" className="mt-3 max-w-2xl font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold uppercase leading-none text-[#ccecff]">{g.title}</h1>
          {g.intro ? <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{g.intro}</p> : null}
          <Button asChild className="mt-6"><Link to="/range" search={{ section: "pens" }}>{g.shop_label}<ArrowRight aria-hidden="true" /></Link></Button>
        </section>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {[
            { title: g.reusable_title, icon: RotateCcw, steps: toPairs(g.reusable_steps) },
            { title: d.title, icon: PenTool, steps: toPairs(d.steps) },
          ].map(({ title, icon: Icon, steps }, si) => (
            <section key={si} className="rounded-lg border border-primary/30 bg-card p-5 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
                <Icon className="h-5 w-5 text-primary" />
                {title}
              </h2>
              <ol className="mt-5 space-y-5">
                {steps.map(([heading, body], i) => (
                  <li key={i}>
                    <h3 className="text-sm font-bold text-foreground">
                      {i + 1}. {heading}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <section className="mt-7 rounded-lg border border-primary/30 bg-card p-5">
          <h2 className="font-display text-lg font-bold uppercase">
            {g.products_title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="whitespace-pre-line">{g.products_body}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {guides.map((p) => (
              <div key={p.slug}>
                <Button asChild variant="outline">
                  <Link to="/product/$slug" params={{ slug: p.slug }}>
                    {p.name}
                  </Link>
                </Button>
                {(p.links ?? [])
                  .filter((l) => /guide|manual|instruction/i.test(l.label) && safeUrl(l.url))
                  .map((l) => (
                    <a
                      key={l.url}
                      href={safeUrl(l.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm text-primary underline"
                    >
                      {l.label}
                    </a>
                  ))}
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
