import { SITE_ORIGIN, seoHead } from "@/lib/seo";
import { canonicalUrl, cmsValues } from "@/lib/storefrontContent";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PenTool, RotateCcw, ArrowRight, Check, Info, Ruler, ShieldCheck, Trash2, Settings, BookOpen, FlaskConical, Syringe, Maximize2, Download } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/lib/useCatalog";
import { ThemedArt, themedArtPair } from "@/components/ThemedImage";

export const Route = createFileRoute("/pen-guide")({
  head: () => seoHead("Titan Guides — Pens, Reconstitution & Administration Kits | Titan Labs Aus", "Titan Guides: compare Titan V2 reusable and disposable pens, and view the supplied Reconstitution Kit and Administration Kit guides.", `${SITE_ORIGIN}/pen-guide`, "/images/titan-catalogue-banner.webp"),
  component: TitanGuides,
});

const TABS = ["pens", "reconstitution", "administration"] as const;
type Tab = (typeof TABS)[number];
const tabFromHash = (h: string): Tab => (TABS as readonly string[]).includes(h.replace(/^#/, "")) ? (h.replace(/^#/, "") as Tab) : "pens";

function TitanGuides() {
  const content = useSiteContent().data;
  const g = cmsValues(content, "guide_pages");
  const docs = cmsValues(content, "guide_documents");
  const banner = themedArtPair(g.banner_image || "/images/titan-catalogue-banner.webp", g.banner_image_light, "/images/titan-pen-guide-banner-light.webp");
  const [tab, setTab] = useState<Tab>("pens");
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ pens: null, reconstitution: null, administration: null });
  useEffect(() => {
    const sync = () => setTab(tabFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const select = (t: Tab, focus = false) => {
    setTab(t);
    // A real history entry, so Back/Forward move between guides via hashchange.
    if (window.location.hash !== `#${t}`) window.history.pushState(null, "", `#${t}`);
    if (focus) refs.current[t]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const next = e.key === "ArrowRight" ? TABS[(i + 1) % 3] : e.key === "ArrowLeft" ? TABS[(i + 2) % 3] : e.key === "Home" ? TABS[0] : e.key === "End" ? TABS[2] : null;
    if (next) { e.preventDefault(); select(next, true); }
  };
  const cards: { id: Tab; label: string; icon: typeof PenTool }[] = [
    { id: "pens", label: docs.pens_tab, icon: PenTool },
    { id: "reconstitution", label: docs.reconstitution_tab, icon: FlaskConical },
    { id: "administration", label: docs.administration_tab, icon: Syringe },
  ];
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="pen-guide-page page-shell py-8 sm:py-12">
        <section aria-labelledby="pen-guide-heading" className="catalogue-banner pen-guide-banner relative isolate overflow-hidden rounded-lg border border-primary/35 p-6 sm:p-8">
          <ThemedArt dark={banner.dark} light={banner.light} sizes="(min-width: 1280px) 1248px, calc(100vw - 32px)" alt="" priority className="pen-guide-art absolute inset-0 -z-20 h-full w-full object-cover object-right" />
          <div className="pen-guide-banner-shade absolute inset-0 -z-10" />
          <p className="font-display text-sm uppercase tracking-[.2em] text-accent">{docs.eyebrow}</p>
          <h1 id="pen-guide-heading" className="pen-guide-banner-title mt-3 max-w-2xl font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold uppercase leading-none">{docs.title}</h1>
          {docs.intro ? <p className="mt-5 max-w-xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{docs.intro}</p> : null}
        </section>
        <div role="tablist" aria-label="Titan Guides" onKeyDown={onKey} className="mt-7 grid auto-rows-fr gap-3 sm:grid-cols-3">
          {cards.map(({ id, label, icon: Icon }) => (
            <button key={id} ref={(el) => { refs.current[id] = el; }} type="button" role="tab" id={`guide-tab-${id}`} aria-controls={`guide-panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onClick={() => select(id)}
              className={`flex h-full min-w-0 items-center gap-3 rounded-lg border p-4 text-left font-display text-base font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === id ? "border-accent bg-primary/15 text-foreground" : "border-primary/25 bg-card text-muted-foreground hover:border-accent"}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon aria-hidden="true" className="h-5 w-5 text-accent" /></span>
              <span className="min-w-0">{label}</span>
            </button>
          ))}
        </div>
        <div role="tabpanel" id="guide-panel-pens" aria-labelledby="guide-tab-pens" hidden={tab !== "pens"}><PenGuidePanel /></div>
        <div role="tabpanel" id="guide-panel-reconstitution" aria-labelledby="guide-tab-reconstitution" hidden={tab !== "reconstitution"}>
          <DocumentGuide title={docs.reconstitution_title} intro={docs.reconstitution_intro} src={docs.reconstitution_image} file="titan-peptide-reconstitution-guide.png" />
        </div>
        <div role="tabpanel" id="guide-panel-administration" aria-labelledby="guide-tab-administration" hidden={tab !== "administration"}>
          <DocumentGuide title={docs.administration_title} intro={docs.administration_intro} src={docs.administration_image} file="titan-administering-kit-usage-guide.png" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function DocumentGuide({ title, intro, src, file }: { title: string; intro: string; src: string; file: string }) {
  const url = canonicalUrl(src ?? "");
  return (
    <section className="mt-7 overflow-hidden rounded-xl border border-primary/30 bg-card" aria-label={title}>
      <div className="border-b border-primary/25 bg-gradient-to-r from-primary/20 to-accent/10 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold uppercase text-foreground">{title}</h2>
        {intro ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{intro}</p> : null}
        {url ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild><a href={url} target="_blank" rel="noopener">View full size<Maximize2 aria-hidden="true" /></a></Button>
            <Button asChild variant="outline"><a href={url} download={file}>Download<Download aria-hidden="true" /></a></Button>
          </div>
        ) : null}
      </div>
      {url ? (
        <div className="guide-document-frame p-3 sm:p-6">
          <a href={url} target="_blank" rel="noopener" className="mx-auto block max-w-3xl overflow-hidden rounded-lg border border-primary/25 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src={url} alt={title} loading="lazy" decoding="async" width={1024} height={1536} className="block h-auto w-full" />
          </a>
        </div>
      ) : <p className="p-6 text-sm text-muted-foreground">This guide is not available yet.</p>}
    </section>
  );
}

function PenGuidePanel() {
  const content = useSiteContent().data;
  const g = cmsValues(content, "guide_pages");
  const learning = cmsValues(content, "guide_learning");
  const faqIcons = [PenTool, Ruler, RotateCcw, Settings, Trash2, ShieldCheck, Info, BookOpen];
  return (
    <>
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
      <div className="pen-compare-grid mt-7 grid gap-3 sm:grid-cols-2">
        {learning.comparison.map((row: { topic: string; reusable: string; disposable: string }, i: number) => <section key={i} className="pen-compare-card min-w-0 rounded-lg border border-primary/25 bg-card p-5"><h3 className="font-display text-lg font-bold uppercase text-accent">{row.topic}</h3><div className="mt-3 space-y-3 text-sm leading-6"><p><span className="font-bold text-foreground">V2 reusable: </span><span className="text-muted-foreground">{row.reusable}</span></p><p><span className="font-bold text-foreground">Disposable: </span><span className="text-muted-foreground">{row.disposable}</span></p></div></section>)}
      </div>
      <section aria-labelledby="pens-101-heading" className="mt-12">
        <div className="flex items-center gap-3"><BookOpen aria-hidden="true" className="h-7 w-7 text-accent" /><h2 id="pens-101-heading" className="font-display text-3xl font-bold uppercase text-foreground">{learning.faq_title}</h2></div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{learning.faq_intro}</p>
        <div className="pen-faq-grid mt-6 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {learning.questions.map((q: { title: string; body: string }, i: number) => { const Icon = faqIcons[i % faqIcons.length] ?? BookOpen; return <article key={i} className="pen-faq-card flex h-full min-w-0 flex-col rounded-xl border border-primary/25 bg-card p-5 transition-colors duration-200 hover:border-accent"><span className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon aria-hidden="true" className="h-5 w-5 text-primary" /></span><h3 className="text-sm font-bold">{q.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{q.body}</p></article>; })}
        </div>
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-6"><h3 className="flex items-center gap-3 font-display text-xl font-bold uppercase"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-accent" />{learning.checklist_title}</h3><ul className="mt-4 grid gap-3 sm:grid-cols-2">{learning.checklist.map((item: { text: string }, i: number) => <li key={i} className="flex gap-3 text-sm leading-6 text-muted-foreground"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary" />{item.text}</li>)}</ul></div>
      </section>
      {g.intro ? <p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{g.intro}</p> : null}
      <div className="mt-8 flex justify-center"><Button asChild size="lg"><Link to="/range" search={{ section: "pens" }}>{g.shop_label}<ArrowRight aria-hidden="true" /></Link></Button></div>
    </>
  );
}
