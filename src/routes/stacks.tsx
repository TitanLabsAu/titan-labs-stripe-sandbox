import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Layers3 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useProducts } from "@/lib/useCatalog";
import { productMatchesCompound, TITAN_STACK_LIBRARY } from "@/lib/titan-stacks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stacks")({
  head: () => ({
    meta: [
      { title: "Titan Stacks | Titan Labs Aus" },
      { name: "description", content: "Browse Titan research collections and jump directly to matching catalogue products." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TitanStacksPage,
});

function TitanStacksPage() {
  const { products } = useProducts();
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <section className="stack-hero relative overflow-hidden rounded-2xl border border-primary/30 bg-card/70 p-6 shadow-glow sm:p-9">
          <div className="relative max-w-3xl">
            <p className="technical-label text-accent">Build your research library</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10"><Layers3 className="h-6 w-6 text-primary" /></span>
              <h1 className="font-display text-[clamp(2.35rem,11vw,3.75rem)] font-black uppercase leading-none tracking-[0.055em] text-foreground sm:text-6xl sm:tracking-[0.08em]">Titan Stacks</h1>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Six research collections based on the stack library shown in your reference video. Select a collection, then choose a compound to open the matching Titan catalogue product when available.</p>
          </div>
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TITAN_STACK_LIBRARY.map((stack) => (
            <a key={stack.id} href={`#${stack.id}`} className="group rounded-2xl border border-primary/25 bg-card/90 p-5 shadow-glow transition hover:border-primary/70 hover:shadow-glow">
              <div className="flex items-start justify-between gap-4">
                <span className="font-display text-4xl font-black text-primary/80">{stack.number}</span>
                <span className={cn("rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest", stack.level === "Advanced" ? "border-accent/45 text-accent" : stack.level === "Intermediate" ? "border-accent/35 text-accent" : "border-primary/40 text-primary")}>{stack.level}</span>
              </div>
              <h2 className="mt-7 font-display text-2xl font-black uppercase tracking-wide text-foreground group-hover:text-primary">{stack.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{stack.subtitle}</p>
              <p className="mt-5 technical-label text-primary">{stack.compounds.length} compounds · Explore</p>
            </a>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {TITAN_STACK_LIBRARY.map((stack) => (
            <section key={stack.id} id={stack.id} className="scroll-mt-6">
              <div className="rounded-2xl border border-primary/25 bg-card/65 p-6 sm:p-8">
                <p className="technical-label text-primary">Collection {stack.number}</p>
                <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-wide text-foreground sm:text-4xl">{stack.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{stack.subtitle}</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {stack.compounds.map((compound) => {
                  const product = products.find((item) => productMatchesCompound(item.name, compound));
                  const card = (
                    <div className={cn("group flex min-h-28 items-center justify-between gap-4 rounded-xl border bg-card p-5 transition", product ? "border-border hover:border-primary hover:shadow-glow" : "border-border/60")}>
                      <div>
                        <p className="technical-label text-accent">Titan research item</p>
                        <h3 className="mt-2 font-display text-xl font-black uppercase tracking-wide text-foreground">{compound}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{product ? product.name : "No matching catalogue item currently available"}</p>
                      </div>
                      {product ? <ArrowRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1" /> : null}
                    </div>
                  );
                  return product ? <Link key={compound} to="/product/$slug" params={{ slug: product.slug }}>{card}</Link> : <div key={compound}>{card}</div>;
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-xl border border-accent/25 bg-accent/5 p-4 text-xs leading-5 text-muted-foreground">These collections reproduce the compound groupings visible in the supplied reference recording for catalogue navigation. They do not reproduce its dose, timing, cycle or administration instructions and are not recommendations for human use.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
