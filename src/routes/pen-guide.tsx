import { cmsValues } from "@/lib/storefrontContent";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PenTool, RotateCcw, ArrowRight, Check, ChevronDown, Info, Ruler, ShieldCheck, Trash2, Settings, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/lib/useCatalog";
export const Route = createFileRoute("/pen-guide")({
  head: () => ({ meta: [{ title: "Titan V2 & Disposable Pen Guides | Titan Labs Aus" }] }),
  component: PenGuide,
});

function PenGuide() {
  const content = useSiteContent().data;
  const g = cmsValues(content, "guide_pages");
  const d = cmsValues(content, "guide_pen");
  const learning = cmsValues(content, "guide_learning");
  const faqIcons = [PenTool, Ruler, RotateCcw, Settings, Trash2, ShieldCheck, Info, BookOpen];
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
        <section className="mt-7 overflow-hidden rounded-xl border border-primary/30 bg-card" aria-labelledby="pen-comparison-heading">
          <div className="border-b border-primary/25 bg-gradient-to-r from-primary/20 to-accent/10 p-6 sm:p-8">
            <h2 id="pen-comparison-heading" className="font-display text-2xl font-bold uppercase text-[#ccecff]">{learning.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{learning.intro}</p>
          </div>
          <div className="grid md:grid-cols-2">
            {[
              { title: g.reusable_title, icon: RotateCcw, steps: learning.reusable_steps },
              { title: d.title, icon: PenTool, steps: learning.disposable_steps },
            ].map(({ title, icon: Icon, steps }, si) => (
              <section key={si} className="p-6 sm:p-8 first:border-b first:border-primary/25 md:first:border-b-0 md:first:border-r">
                <h3 className="flex items-center gap-3 font-display text-xl font-bold uppercase"><Icon aria-hidden="true" className="h-6 w-6 shrink-0 text-accent" />{title}</h3>
                <ol className="mt-6 space-y-6">
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
          <div className="flex items-center gap-3"><BookOpen aria-hidden="true" className="h-7 w-7 text-accent" /><h2 id="pens-101-heading" className="font-display text-3xl font-bold uppercase text-[#ccecff]">{learning.faq_title}</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{learning.faq_intro}</p>
          <div className="mt-6 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learning.questions.map((q: { title: string; body: string }, i: number) => { const Icon = faqIcons[i % faqIcons.length]!; return <details key={i} className="group rounded-xl border border-primary/25 bg-card p-5 open:border-accent/50"><summary className="cursor-pointer list-none"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Icon aria-hidden="true" className="h-5 w-5 text-primary" /></span><span className="flex items-start justify-between gap-3 text-sm font-bold">{q.title}<ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-accent transition-transform group-open:rotate-180" /></span></summary><p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">{q.body}</p></details>; })}
          </div>
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6"><h3 className="flex items-center gap-3 font-display text-xl font-bold uppercase"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-accent" />{learning.checklist_title}</h3><ul className="mt-4 grid gap-3 sm:grid-cols-2">{learning.checklist.map((item: { text: string }, i: number) => <li key={i} className="flex gap-3 text-sm leading-6 text-muted-foreground"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary" />{item.text}</li>)}</ul></div>
        </section>
        <div className="mt-8 flex justify-center"><Button asChild size="lg"><Link to="/range" search={{ section: "pens" }}>{g.shop_label}<ArrowRight aria-hidden="true" /></Link></Button></div>
      </main>
      <SiteFooter />
    </div>
  );
}
