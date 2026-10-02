import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useProducts } from "@/lib/useCatalog";

export const Route = createFileRoute("/research-lab")({
  head: () => ({ meta: [{ title: "Titan's Research Lab | Titan Labs Aus" }] }),
  component: ResearchLabPage,
});

function ResearchLabPage() {
  const { products } = useProducts();
  return <div className="bg-hero min-h-screen"><SiteHeader/><main className="page-shell py-10 sm:py-14">
    <div className="max-w-3xl"><p className="technical-label text-accent">Education & research</p><h1 className="mt-2 text-3xl font-medium uppercase sm:text-4xl">Titan&apos;s Research Lab</h1>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">A deeper reference for the products in The Range. Information shown here is managed from Titan Admin and is provided for research and educational purposes.</p></div>
    <div className="mt-8 grid gap-4">{products.map((p) => <details key={p.slug} id={p.slug} className="border border-border bg-card p-5 shadow-sm">
      <summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{(p.categories ?? []).join(" · ") || "Research reference"}</p><h2 className="mt-1 text-xl font-bold uppercase">{p.name}</h2></div><BookOpen className="h-5 w-5 text-primary"/></div></summary>
      <div className="mt-5 border-t border-border pt-5">
        {p.description ? <section><h3 className="technical-label text-foreground">Overview</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{p.description}</p></section> : null}
        {p.details.length ? <section className="mt-5"><h3 className="technical-label text-foreground">Research notes & key points</h3><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{p.details.map((d)=><li key={d}>★ {d}</li>)}</ul></section> : null}
        {p.protocol ? <section className="mt-5"><h3 className="technical-label text-foreground">Additional research notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{p.protocol}</p></section> : null}
        {(p.links ?? []).length ? <section className="mt-5"><h3 className="technical-label text-foreground">References & documents</h3><div className="mt-2 flex flex-wrap gap-2">{p.links?.map(l=><a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 border border-border px-3 py-2 text-xs font-semibold hover:border-primary">{l.label || "Reference"}<ExternalLink className="h-3 w-3"/></a>)}</div></section> : null}
        <div className="mt-6"><Link to="/product/$slug" params={{slug:p.slug}} className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground">View product</Link></div>
      </div>
    </details>)}</div>
    <p className="mt-8 border-l-2 border-l-accent pl-4 text-xs leading-5 text-muted-foreground">Research information is not a substitute for medical advice. Products are supplied for research purposes only.</p>
  </main><SiteFooter/></div>;
}