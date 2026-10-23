import { SITE_ORIGIN, seoHead } from "@/lib/seo";
import { cmsValues } from "@/lib/storefrontContent";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PenTool, RotateCcw, ArrowRight, Check, Info, Ruler, ShieldCheck, Trash2, Settings, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/lib/useCatalog";
import { ThemedArt, themedArtPair } from "@/components/ThemedImage";
export const Route = createFileRoute("/pen-guide")({
   head: () => seoHead("Titan V2 & Disposable Pen Guides | Titan Labs Aus", "Compare Titan V2 reusable and disposable pens. Explore pen features, handling guides, common questions and links to the Pens catalogue.", `${SITE_ORIGIN}/pen-guide`),
  component: PenGuide,
});

function PenGuide() {
  const content = useSiteContent().data;
  const g = cmsValues(content, "guide_pages");
  const d = cmsValues(content, "guide_pen");
  const learning = cmsValues(content, "guide_learning");
  const faqIcons = [PenTool, Ruler, RotateCcw, Settings, Trash2, ShieldCheck, Info, BookOpen];
  const banner = themedArtPair(g.banner_image || "/images/titan-catalogue-banner.webp", g.banner_image_light, "/images/titan-pen-guide-banner-light.webp");
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="pen-guide-page page-shell py-8 sm:py-12">
        <section aria-labelledby="pen-guide-heading" className="catalogue-banner pen-guide-banner relative isolate overflow-hidden rounded-lg border border-primary/35 p-6 sm:p-8">
           <ThemedArt dark={banner.dark} light={banner.light} sizes="(min-width: 1280px) 1248px, calc(100vw - 32px)" alt="" priority className="pen-guide-art absolute inset-0 -z-20 h-full w-full object-cover object-right" />
          <div className="pen-guide-banner-shade absolute inset-0 -z-10" />
          <p className="font-display text-sm uppercase tracking-[.2em] text-accent">{g.eyebrow}</p>
          <h1 id="pen-guide-heading" className="pen-guide-banner-title mt-3 max-w-2xl font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold uppercase leading-none">{g.title}</h1>
          {g.intro ? <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{g.intro}</p> : null}
          <Button asChild className="mt-6"><Link to="/range" search={{ section: "pens" }}>{g.shop_label}<ArrowRight aria-hidden="true" /></Link></Button>
        </section>
         <section className="mt-7 overflow-hidden rounded-xl border border-primary/30 bg-card" aria-labelledby="pen-comparison-heading">
          <div className="border-b border-primary/25 bg-gradient-to-r from-primary/20 to-accent/10 p-6 sm:p-8">
            <h2 id="pen-comparison-heading" className="font-display text-2xl font-bold uppercase text-foreground">{learning.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{learning.intro}</p>
          </div>
           <div className="grid md:grid-cols-2">
            {[
               { title: learning.reusable_title, icon: RotateCcw, steps: learning.reusable_steps },
               { title: learning.disposable_title, icon: PenTool, steps: learning.disposable_steps },
            ].map(({ title, icon: Icon, steps }, si) => (
               <section key={si} className="min-w-0 p-6 sm:p-8 first:border-b first:border-primary/25 md:first:border-b-0 md:first:border-r">
                 <h3 className="flex items-center gap-3 font-display text-xl font-bold uppercase"><Icon aria-hidden="true" className="h-6 w-6 shrink-0 text-accent" />{title}</h3>
                 <ol className="mt-6 space-y-5">
                  {steps.map((step: { title: string; body: string }, i: number) => (
                     <li key={i} className="flex gap-4">
                       <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-display font-bold text-accent">{i + 1}</span>
                      <div><h4 className="text-sm font-bold text-foreground">{step.title}</h4><p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{step.body}</p></div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {learning.comparison.map((row: { topic: string; reusable: string; disposable: string }, i: number) => <section key={i} className="rounded-lg border border-primary/25 bg-card p-5"><h3 className="font-display text-lg font-bold uppercase text-accent">{row.topic}</h3><div className="mt-3 space-y-3 text-sm leading-6"><p><span className="font-bold text-foreground">V2 reusable: </span><span className="text-muted-foreground">{row.reusable}</span></p><p><span className="font-bold text-foreground">Disposable: </span><span className="text-muted-foreground">{row.disposable}</span></p></div></section>)}
        </div>
        <section aria-labelledby="pens-101-heading" className="mt-12">
          <div className="flex items-center gap-3"><BookOpen aria-hidden="true" className="h-7 w-7 text-accent" /><h2 id="pens-101-heading" className="font-display text-3xl font-bold uppercase text-foreground">{learning.faq_title}</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{learning.faq_intro}</p>
          <div className="pen-faq-grid mt-6 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learning.questions.map((q: { title: string; body: string }, i: number) => { const Icon = faqIcons[i % faqIcons.length] ?? BookOpen; return <article key={i} className="pen-faq-card flex min-w-0 flex-col rounded-xl border border-primary/25 bg-card p-5 transition-colors duration-200 hover:border-accent"><span className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon aria-hidden="true" className="h-5 w-5 text-primary" /></span><h3 className="text-sm font-bold">{q.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{q.body}</p></article>; })}
          </div>
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6"><h3 className="flex items-center gap-3 font-display text-xl font-bold uppercase"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-accent" />{learning.checklist_title}</h3><ul className="mt-4 grid gap-3 sm:grid-cols-2">{learning.checklist.map((item: { text: string }, i: number) => <li key={i} className="flex gap-3 text-sm leading-6 text-muted-foreground"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary" />{item.text}</li>)}</ul></div>
        </section>
        <div className="mt-8 flex justify-center"><Button asChild size="lg"><Link to="/range" search={{ section: "pens" }}>{g.shop_label}<ArrowRight aria-hidden="true" /></Link></Button></div>
      </main>
      <SiteFooter />
    </div>
  );
}
