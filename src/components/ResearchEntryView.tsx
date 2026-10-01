import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, BookOpen, ExternalLink, Info, ListChecks } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ResearchEvidenceBadge } from "@/components/ResearchEvidenceBadge";
import { RichText } from "@/components/RichText";
import { BLEND_NOTICE, EVIDENCE_EXPLANATIONS, EVIDENCE_TYPES, VERIFIED_EXPLANATION, doiUrl, label, pubchemUrl, pubmedUrl, safeUrl, type ResearchEntry, type ResearchSection } from "@/lib/research";

const compositionHeading = /composition|identifier/i;
const crossRegHeading = /cross[- ]?reference|regulatory/i;

export function ResearchEntryView({ entry, preview = false }: { entry: ResearchEntry; preview?: boolean }) {
  const pubchem = pubchemUrl(entry.pubchem_cid);
  const identifiers = [["Molecular formula", entry.molecular_formula], ["CAS number", entry.cas_number], ["PubChem CID", entry.pubchem_cid]].filter((item): item is [string, string] => Boolean(item[1]));
  const composition = entry.content.filter((section) => compositionHeading.test(section.heading));
  const crossReg = entry.content.filter((section) => crossRegHeading.test(section.heading));
  const details = entry.content.filter((section) => !compositionHeading.test(section.heading) && !crossRegHeading.test(section.heading));

  return (
    <article className="mx-auto max-w-5xl">
      <Link to={preview ? "/research-preview" : "/research"} className="inline-flex min-h-11 items-center gap-2 font-display text-xs font-bold uppercase text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Research Lab
      </Link>

      <header className="mt-4 border-b border-border pb-7">
        <p className="technical-label text-accent">{entry.category || "Research"}</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-medium uppercase text-foreground sm:text-5xl">{entry.title}</h1>
            {entry.synonyms.length ? <p className="mt-2 text-sm text-muted-foreground">Also known as {entry.synonyms.join(" · ")}</p> : null}
          </div>
          <ResearchEvidenceBadge status={entry.evidence_status} className="self-start sm:self-auto" />
        </div>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-12 lg:items-start">
        <div className="space-y-5 lg:col-span-8">
          <section className="border-l-2 border-l-primary bg-card p-5 shadow-glow sm:p-7">
            <p className="technical-label text-primary">At a glance</p>
            <p className="mt-3 text-lg leading-8 text-foreground">{entry.at_a_glance || entry.summary}</p>
          </section>

          <section className="border border-primary/30 bg-primary/10 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-display text-base font-bold uppercase text-foreground">Evidence explained</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{EVIDENCE_EXPLANATIONS[entry.evidence_status]}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Evidence level describes the cited research, not safety, efficacy, suitability or approval.</p>
              </div>
            </div>
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
            <section className="border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" aria-hidden="true" /><h2 className="font-display text-lg font-bold uppercase text-foreground">What researchers are studying</h2></div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {entry.research_findings.map((finding, index) => <li key={index} className="border-l-2 border-l-accent bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">{finding}</li>)}
              </ul>
            </section>
          ) : null}

          <Accordion type="multiple" className="border border-border bg-card px-5 sm:px-7">
            <AccordionItem value="research-details">
              <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline">Research details</AccordionTrigger>
              <AccordionContent className="space-y-6 text-base leading-7 text-muted-foreground">
                {entry.summary ? <DetailSection heading="Verified summary" body={entry.summary} /> : null}
                {details.map((section, index) => <DetailSection key={index} heading={section.heading || "Research notes"} body={section.body} />)}
              </AccordionContent>
            </AccordionItem>
            {composition.length || identifiers.length || entry.sequence ? (
              <AccordionItem value="composition">
                <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline">Composition &amp; identifiers</AccordionTrigger>
                <AccordionContent className="space-y-6 text-base leading-7 text-muted-foreground">
                  {composition.map((section, index) => <DetailSection key={index} heading={section.heading} body={section.body} />)}
                  {identifiers.length || entry.sequence ? <dl className="grid gap-4 sm:grid-cols-2">{identifiers.map(([name, value]) => <div key={name}><dt className="technical-label text-muted-foreground">{name}</dt><dd className="mt-1 break-all font-mono text-sm font-bold text-foreground">{name === "PubChem CID" && pubchem ? <a href={pubchem} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a> : value}</dd></div>)}{entry.sequence ? <div className="sm:col-span-2"><dt className="technical-label text-muted-foreground">Sequence</dt><dd className="mt-1 break-all font-mono text-sm text-foreground">{entry.sequence}</dd></div> : null}</dl> : null}
                </AccordionContent>
              </AccordionItem>
            ) : null}
            {crossReg.length ? (
              <AccordionItem value="cross-regulatory">
                <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline">Cross-reference &amp; regulatory status</AccordionTrigger>
                <AccordionContent className="space-y-6 text-base leading-7 text-muted-foreground">{crossReg.map((section, index) => <DetailSection key={index} heading={section.heading} body={section.body} />)}</AccordionContent>
              </AccordionItem>
            ) : null}
            {entry.source_references.length ? (
              <AccordionItem value="references">
                <AccordionTrigger className="min-h-14 font-display text-base font-bold uppercase text-foreground hover:no-underline"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />References ({entry.source_references.length})</span></AccordionTrigger>
                <AccordionContent><ReferenceList entry={entry} /></AccordionContent>
              </AccordionItem>
            ) : null}
          </Accordion>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-4">
          {entry.verification_status === "verified" ? <div className="border border-border bg-card p-5"><p className="technical-label text-primary">Source-checked entry</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{VERIFIED_EXPLANATION}</p></div> : null}
          <div className="border border-border bg-secondary p-5"><p className="technical-label text-foreground">Research-use information</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Educational research reference only. Not medical advice. Laboratory and animal findings do not establish effects in humans. Products supplied by Titan Labs Australia are for laboratory research use only and are not for human or animal consumption.</p></div>
          {entry.updated_at ? <p className="px-1 text-xs text-muted-foreground">Last updated <span className="font-bold text-foreground">{new Date(entry.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" })}</span></p> : null}
        </aside>
      </div>
    </article>
  );
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