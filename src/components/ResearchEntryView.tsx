import { cmsValues } from "@/lib/storefrontContent";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { researchProducts } from "@/lib/research-products";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, ExternalLink, Layers3, ListChecks } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichText } from "@/components/RichText";
import { BLEND_NOTICE, EVIDENCE_EXPLANATIONS, EVIDENCE_TYPES, VERIFIED_EXPLANATION, doiUrl, label, pubchemUrl, pubmedUrl, safeUrl, type ResearchEntry, type ResearchSection } from "@/lib/research";
import { blendsForEntry, relatedResearch } from "@/lib/research-discovery";

const compositionHeading = /composition|identifier/i;
const crossRegHeading = /cross[- ]?reference|regulatory/i;

export function ResearchEntryView({ entry, entries = [], preview = false }: { entry: ResearchEntry; entries?: ResearchEntry[]; preview?: boolean }) {
  const {products} = useProducts();
  const lb = cmsValues(useSiteContent().data, "research_entry");
  const linkedProducts = researchProducts(entry,products);
  const pubchem = pubchemUrl(entry.pubchem_cid);
  const identifiers = [["Molecular formula", entry.molecular_formula], ["CAS number", entry.cas_number], ["PubChem CID", entry.pubchem_cid]].filter((item): item is [string, string] => Boolean(item[1]));
  const composition = entry.content.filter((section) => compositionHeading.test(section.heading));
  const crossReg = entry.content.filter((section) => crossRegHeading.test(section.heading));
  const details = entry.content.filter((section) => !compositionHeading.test(section.heading) && !crossRegHeading.test(section.heading));
  const related = relatedResearch(entry, entries);
  const blends = blendsForEntry(entry);

  return (
    <article className="mx-auto max-w-5xl">
      <Link to={preview ? "/research-preview" : "/research"} className="inline-flex min-h-11 items-center gap-2 font-display text-xs font-bold uppercase text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Research Lab
      </Link>

      {linkedProducts.length?<div className="mt-4 flex flex-wrap gap-2">{linkedProducts.map(p=><Link key={p.slug} to="/product/$slug" params={{slug:p.slug}} className="rounded-lg border border-primary/30 px-4 py-3 text-xs font-bold text-primary">Product Info · {p.name}</Link>)}</div>:null}
      <header className="mt-4 border-b border-border pb-7">
        <p className="technical-label text-accent">{entry.category || "Research"}</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[clamp(2.15rem,10vw,3rem)] font-black uppercase leading-none tracking-[0.055em] text-foreground sm:text-5xl sm:tracking-[0.08em]">{entry.title}</h1>
            {entry.synonyms.length ? <p className="mt-2 text-sm text-muted-foreground">Also known as {entry.synonyms.join(" · ")}</p> : null}
          </div>
        </div>
      </header>

      <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Quick research map">
        <ResearchMapItem label={lb.map_area} value={entry.category || "Research"} />
        <ResearchMapItem label={lb.map_refs} value={String(entry.source_references.length)} />
        <ResearchMapItem label={lb.map_check} value={entry.verification_status === "verified" ? "Verified" : "In review"} />
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-12 lg:items-start">
        <div className="space-y-5 lg:col-span-8">
          <section className="border-l-2 border-l-primary bg-card p-5 shadow-glow sm:p-7">
            <p className="technical-label text-primary">{lb.quick_read}</p>
            <p className="mt-3 text-lg leading-8 text-foreground">{entry.at_a_glance || entry.summary}</p>
          </section>

          <section>
                <h2 className="font-display text-base font-bold uppercase text-foreground">{lb.level}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{EVIDENCE_EXPLANATIONS[entry.evidence_status]}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Evidence level describes the cited research, not safety, efficacy, suitability or approval.</p>
          </section>

          {entry.blend_notice ? (
            <section className="border border-accent/60 bg-accent/10 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <div><h2 className="font-display text-base font-bold uppercase text-foreground">Combined formulation evidence</h2><p className="mt-2 text-sm font-semibold leading-6 text-foreground">{BLEND_NOTICE}</p></div>
              </div>
            </section>
          ) : null}

          {entry.research_findings.length ? (
            <section className="rounded-2xl border border-primary/25 bg-card/90 p-5 shadow-glow sm:p-7">
              <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" aria-hidden="true" /><h2 className="font-display text-lg font-bold uppercase text-foreground">{lb.studying}</h2></div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {entry.research_findings.map((finding, index) => <li key={index} className="border-l-2 border-l-accent bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">{finding}</li>)}
              </ul>
            </section>
          ) : null}

          {related.length ? (
            <section className="rounded-2xl rounded-2xl border border-primary/25 bg-card/90 p-5 shadow-glow sm:p-7">
              <p className="technical-label text-primary">{lb.related_eyebrow}</p>
              <h2 className="mt-1 font-display text-lg font-bold uppercase text-foreground">{lb.related_title}</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {related.map((item) => (
                  <Link key={item.id} to={preview ? "/research-preview/$slug" : "/research/$slug"} params={{ slug: item.slug }} className="group flex min-h-12 items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground hover:border-primary">
                    {item.title}<ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {blends.length ? (
            <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5 sm:p-6">
              <div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-primary" /><h2 className="font-display text-base font-bold uppercase text-foreground">{lb.blends}</h2></div>
              <div className="mt-3 flex flex-wrap gap-2">{blends.map((blend) => <span key={blend.slug} className="rounded-full border border-primary/30 bg-background px-3 py-1.5 text-xs font-bold uppercase text-foreground">{blend.title}</span>)}</div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Ingredient research does not establish the effects, safety or efficacy of the combined formulation.</p>
            </section>
          ) : null}

          <Accordion type="multiple" className="rounded-2xl border border-primary/25 bg-card/90 px-5 shadow-glow sm:px-7">
            <AccordionItem value="research-details">
              <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline">{lb.details}</AccordionTrigger>
              <AccordionContent className="space-y-6 text-base leading-7 text-muted-foreground">
                {entry.summary ? <DetailSection heading="Verified summary" body={entry.summary} /> : null}
                {details.map((section, index) => <DetailSection key={index} heading={section.heading || "Research notes"} body={section.body} />)}
              </AccordionContent>
            </AccordionItem>
            {composition.length || identifiers.length || entry.sequence ? (
              <AccordionItem value="composition">
                <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline">{lb.composition}</AccordionTrigger>
                <AccordionContent className="space-y-6 text-base leading-7 text-muted-foreground">
                  {composition.map((section, index) => <DetailSection key={index} heading={section.heading} body={section.body} />)}
                  {identifiers.length || entry.sequence ? <dl className="grid gap-4 sm:grid-cols-2">{identifiers.map(([name, value]) => <div key={name}><dt className="technical-label text-muted-foreground">{name}</dt><dd className="mt-1 break-all font-mono text-sm font-bold text-foreground">{name === "PubChem CID" && pubchem ? <a href={pubchem} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a> : value}</dd></div>)}{entry.sequence ? <div className="sm:col-span-2"><dt className="technical-label text-muted-foreground">Sequence</dt><dd className="mt-1 break-all font-mono text-sm text-foreground">{entry.sequence}</dd></div> : null}</dl> : null}
                </AccordionContent>
              </AccordionItem>
            ) : null}
            {crossReg.length ? (
              <AccordionItem value="cross-regulatory">
                <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline">{lb.crossref}</AccordionTrigger>
                <AccordionContent className="space-y-6 text-base leading-7 text-muted-foreground">{crossReg.map((section, index) => <DetailSection key={index} heading={section.heading} body={section.body} />)}</AccordionContent>
              </AccordionItem>
            ) : null}
            {entry.source_references.length ? (
              <AccordionItem value="references">
                <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />{lb.references} ({entry.source_references.length})</span></AccordionTrigger>
                <AccordionContent><ReferenceList entry={entry} /></AccordionContent>
              </AccordionItem>
            ) : null}
          </Accordion>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-4">
          {entry.verification_status === "verified" ? <div className="rounded-2xl border border-primary/25 bg-card/90 p-5 shadow-glow"><p className="technical-label text-primary">Source-checked entry</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{VERIFIED_EXPLANATION}</p></div> : null}
          <div className="border border-border bg-secondary p-5"><p className="technical-label text-foreground">Research-use information</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Educational research reference only. Not medical advice. Laboratory and animal findings do not establish effects in humans. Products supplied by Titan Labs Australia are for laboratory research use only and are not for human or animal consumption.</p></div>
          {entry.updated_at ? <p className="px-1 text-xs text-muted-foreground">Last updated <span className="font-bold text-foreground">{new Date(entry.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" })}</span></p> : null}
        </aside>
      </div>
    </article>
  );
}

function ResearchMapItem({ label: itemLabel, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-primary/20 bg-card/90 p-4"><p className="technical-label text-muted-foreground">{itemLabel}</p><p className="mt-2 font-display text-sm font-bold uppercase text-foreground">{value}</p></div>;
}

function DetailSection({ heading, body }: ResearchSection) {
  return <section><h3 className="font-display text-sm font-bold uppercase text-foreground">{heading}</h3><div className="mt-2"><RichText text={body} /></div></section>;
}

function ReferenceList({ entry }: { entry: ResearchEntry }) {
  return <ol className="list-decimal space-y-5 pl-5 text-sm leading-6 text-muted-foreground">{entry.source_references.map((reference, index) => {
    const href = safeUrl(reference.url);
    const pubmed = pubmedUrl(reference.pmid);
    const doi = doiUrl(reference.doi);
    const meta = [reference.authors, reference.source, reference.year].filter(Boolean).join(", ");
    return <li key={index} className="pl-1"><span className="mb-2 inline-flex border border-border bg-background px-2 py-0.5 font-display text-[0.65rem] font-bold uppercase text-foreground">{reference.evidence_type ? label(EVIDENCE_TYPES, reference.evidence_type) : "Reference"}</span><div>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">{reference.title || href} <ExternalLink className="inline h-3 w-3" aria-hidden="true" /></a> : <span className="font-bold text-foreground">{reference.title}</span>}{meta ? <span> — {meta}</span> : null}</div>{pubmed || doi ? <div className="mt-1 flex flex-wrap gap-3 text-xs">{pubmed ? <a href={pubmed} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PMID {reference.pmid}</a> : null}{doi ? <a href={doi} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DOI {reference.doi}</a> : null}</div> : null}</li>;
  })}</ol>;
}
