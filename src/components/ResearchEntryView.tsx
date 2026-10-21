import { cmsValues } from "@/lib/storefrontContent";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { researchProducts } from "@/lib/research-products";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/RichText";
import { BLEND_NOTICE, EVIDENCE_EXPLANATIONS, EVIDENCE_TYPES, VERIFIED_EXPLANATION, doiUrl, label, pubchemUrl, pubmedUrl, safeUrl, type ResearchEntry, type ResearchSection } from "@/lib/research";
import { blendsForEntry, relatedResearch } from "@/lib/research-discovery";
import { researchSourceDescription } from "@/lib/research-source-descriptions";
import { researchDetailModel } from "@/lib/research-detail";
import { ResearchShowcase } from "@/components/ResearchShowcase";
import { ResearchSubjectiveScorecard } from "@/components/ResearchSubjectiveScorecard";
import { isResearchReferenceSection } from "@/lib/research-reference-fields";

export function ResearchEntryView({ entry, entries = [], preview = false }: { entry: ResearchEntry; entries?: ResearchEntry[]; preview?: boolean }) {
  const { products } = useProducts();
  const lb = cmsValues(useSiteContent().data, "research_entry");
  const linkedProducts = researchProducts(entry, products);
  const model = researchDetailModel(entry);
  const source = researchSourceDescription(entry, entries);
  const related = relatedResearch(entry, preview ? entries : entries.filter(item => item.published));
  const blends = blendsForEntry(entry);
  const pubchem = pubchemUrl(entry.pubchem_cid);
  const identifiers = [["Molecular formula", entry.molecular_formula], ["CAS number", entry.cas_number], ["PubChem CID", entry.pubchem_cid]].filter((item): item is [string, string] => Boolean(item[1]));
  return <article className="research-detail" data-research-detail>
    <header className="research-detail-hero">
      <div>
        <span className="research-category research-mono">{entry.category || "Research"}</span>
        <h1>{entry.title}</h1>
        {source ? <div data-research-source-description className="research-hero-source">
          <p className="research-nickname">“{source.nick}”</p>
          <blockquote>{source.one}</blockquote>
          <p className="research-source-credit">Donny Optimize source description · Quotation, not a verified Titan finding or endorsement of efficacy, safety or medical approval.</p>
        </div> : <div className="research-hero-overview"><RichText text={model.overview} /></div>}
        {entry.synonyms.length ? <p className="research-aliases">Also known as {entry.synonyms.join(" · ")}</p> : null}
        {linkedProducts.length ? <div className="research-product-links">{linkedProducts.map(p => <Button asChild variant="outline" key={p.slug}><Link to="/product/$slug" params={{ slug: p.slug }}>Product Info · {p.name}<ArrowRight /></Link></Button>)}</div> : null}
      </div>
      <ResearchShowcase entry={entry} references={model.counts.references} notes={model.counts.notes} related={related.length} />
    </header>
    <dl className="research-quick-strip">{model.quick.map(item => <div key={item.label}><dt className="research-mono">{item.label}</dt><dd>{item.value}</dd></div>)}</dl>

    <section className="research-numbered-section" aria-labelledby="research-scorecard">
      <SectionHeading number="01" eyebrow="THE SCORECARD" title="Research at a glance" id="research-scorecard" />
      <p className="research-section-note">Counts describe this saved entry, not efficacy or safety.</p>
      <dl className="research-factual-counts" aria-label="Saved entry counts">{[["Source references", model.counts.references], ["Research notes", model.counts.notes], ["Research findings", model.counts.findings]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd className="research-mono">{value}</dd></div>)}</dl>
      <ResearchSubjectiveScorecard entry={entry} entries={entries} />
      <p className="research-section-note">Titan clinical efficacy and safety ratings are not assigned.</p>
    </section>

    <section className="research-numbered-section" aria-labelledby="research-mechanism">
      <SectionHeading number="02" eyebrow="HOW IT WORKS" title="The mechanism" id="research-mechanism" />
      <div className="research-module-grid">{model.mechanism.length ? model.mechanism.map((section, index) => <div className="research-note-card" key={index}><span className="research-step-number">{String(index + 1).padStart(2, "0")}</span><DetailSection heading={section.heading} body={section.body} /></div>) : <p className="research-section-note">Reported mechanism not available in this saved entry.</p>}</div>
    </section>

    <section className="research-numbered-section" aria-labelledby="research-interests">
      <SectionHeading number="03" eyebrow="AREAS STUDIED" title="Research interests" id="research-interests" />
      <div className="research-module-grid">{model.findings.length ? model.findings.map((finding, index) => <div key={index} className="research-note-card"><span className="research-interest-number research-mono">{String(index + 1).padStart(2, "0")}</span><RichText text={finding} /></div>) : <p className="research-section-note">Research findings not available in this saved entry.</p>}</div>
    </section>

    {model.protocol.length ? <section className="research-numbered-section" aria-labelledby="research-protocol">
      <SectionHeading number="04" eyebrow="PROTOCOL REFERENCE" title="Protocol readout" id="research-protocol" />
      <div className="research-terminal"><div className="research-terminal-bar research-mono"><span aria-hidden="true">● ● ●</span>{entry.slug}_protocol.cfg</div><dl>{model.protocol.map(item => <div key={item.label}><dt className="research-mono">{item.label}</dt><dd className="whitespace-pre-wrap break-words">{item.value}</dd></div>)}</dl><p className="research-terminal-note">Educational research reference only. Not medical advice.</p></div>
    </section> : null}

    <section className="research-numbered-section" aria-labelledby="research-related">
      <SectionHeading number="05" eyebrow="RELATED RESEARCH" title="Related compounds" id="research-related" />
      <div className="research-module-grid">{related.map(item => <Link className="research-related-card" key={item.id} to={preview ? "/research-preview/$slug" : "/research/$slug"} params={{ slug: item.slug }}><span className="research-related-tag research-mono">{item.category || "Research"}</span><h3>{item.title}</h3><ArrowRight aria-hidden="true" /></Link>)}</div>
      {blends.length ? <div className="research-blends"><h3>{lb.blends}</h3><div>{blends.map(blend => <span key={blend.slug}>{blend.title}</span>)}</div><p>Ingredient research does not establish the effects, safety or efficacy of the combined formulation.</p></div> : null}
      <div className="research-library-links"><Button asChild><Link to={preview ? "/research-preview" : "/research"}>Browse the full library <ArrowRight /></Link></Button><Button asChild variant="outline"><Link to="/research/protocol-stacks">See protocol stacks <ArrowRight /></Link></Button></div>
    </section>

    <section className="research-science-section">
      <Accordion type="multiple">
        <AccordionItem value="science"><AccordionTrigger className="research-science-trigger">Science &amp; References</AccordionTrigger><AccordionContent className="research-science-content">
          {entry.at_a_glance ? <DetailSection heading={lb.quick_read} body={entry.at_a_glance} /> : null}
          {entry.summary ? <DetailSection heading="Verified summary" body={entry.summary} /> : null}
          {entry.content.filter(section => !isResearchReferenceSection(section)).map((section, index) => <DetailSection key={index} heading={section.heading || "Research notes"} body={section.body} />)}
          {entry.research_findings.length ? <section><h3>{lb.studying}</h3><ul className="list-disc space-y-3 pl-5">{entry.research_findings.map((finding, index) => <li key={index}><RichText text={finding} /></li>)}</ul></section> : null}
          {identifiers.length || entry.sequence ? <dl className="research-identifiers">{identifiers.map(([name, value]) => <div key={name}><dt className="research-mono">{name}</dt><dd>{name === "PubChem CID" && pubchem ? <a href={pubchem} target="_blank" rel="noopener noreferrer">{value}</a> : value}</dd></div>)}{entry.sequence ? <div><dt className="research-mono">Sequence</dt><dd>{entry.sequence}</dd></div> : null}</dl> : null}
          <section><h3>{lb.level}</h3><p>{EVIDENCE_EXPLANATIONS[entry.evidence_status]}</p><p>Evidence level describes the cited research, not safety, efficacy, suitability or approval.</p></section>
          {entry.blend_notice ? <section><h3>Combined formulation evidence</h3><p>{BLEND_NOTICE}</p></section> : null}
          {entry.source_references.length ? <section><h3>{lb.references} ({entry.source_references.length})</h3><ReferenceList entry={entry} /></section> : null}
        </AccordionContent></AccordionItem>
      </Accordion>
      {entry.verification_status === "verified" ? <div className="research-verification"><h3>Source-checked entry</h3><p>{VERIFIED_EXPLANATION}</p></div> : null}
      <div className="research-disclaimer"><h3>Research-use information</h3><p>Educational research reference only. Not medical advice. Laboratory and animal findings do not establish effects in humans. Products supplied by Titan Labs Australia are for laboratory research use only and are not for human or animal consumption.</p></div>
      {entry.updated_at ? <p className="research-updated">Last updated {new Date(entry.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" })}</p> : null}
    </section>
  </article>;
}

function SectionHeading({ number, eyebrow, title, id }: { number: string; eyebrow: string; title: string; id: string }) {
  return <><p className="research-section-eyebrow research-mono">{number} · {eyebrow}</p><h2 id={id}>{title}</h2></>;
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
