import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichText } from "@/components/RichText";
import { researchDetailModel } from "@/lib/research-detail";
import { researchExplanations, type ExplanationCard } from "@/lib/research-explanations";
import type { ResearchEntry } from "@/lib/research";

function Cards({ cards, benefits = false }: { cards: ExplanationCard[]; benefits?: boolean }) {
  return <div className={`research-module-grid research-explanation-grid ${benefits ? "research-benefit-grid" : ""}`}>
    {cards.map(card => <figure className="research-note-card" key={card.num} data-editorial-card>
      <span className={benefits ? "research-interest-number research-mono" : "research-step-number"}>{card.num}</span>
      <figcaption><h3>{card.title}</h3></figcaption><blockquote>{card.desc}</blockquote>
    </figure>)}
  </div>;
}

export function ResearchExplanations({ entry, entries }: { entry: ResearchEntry; entries: ResearchEntry[] }) {
  const source = researchExplanations(entry, entries);
  const model = researchDetailModel(entry);
  const sourceMechanism = Boolean(source?.plain.length || source?.science.length);
  return <div data-compact-explanations>
    <section className="research-numbered-section" aria-labelledby="research-mechanism" data-mechanism>
      {sourceMechanism && source ? <Tabs defaultValue={source.plain.length ? "plain" : "science"}>
        <div className="research-explanation-heading"><div><p className="research-section-eyebrow research-mono">02 · HOW IT WORKS</p><h2 id="research-mechanism">The mechanism</h2></div>
          <TabsList aria-label="Mechanism wording"><TabsTrigger value="plain" disabled={!source.plain.length}>Plain English</TabsTrigger><TabsTrigger value="science" disabled={!source.science.length}>Science</TabsTrigger></TabsList>
        </div>
        <TabsContent value="plain"><Cards cards={source.plain} /></TabsContent>
        <TabsContent value="science"><Cards cards={source.science} /></TabsContent>
      </Tabs> : <><div className="research-explanation-heading"><div><p className="research-section-eyebrow research-mono">02 · HOW IT WORKS</p><h2 id="research-mechanism">The mechanism</h2></div></div>
        <div className="research-module-grid research-explanation-grid">{model.mechanism.length ? model.mechanism.map((section, index) => <section className="research-note-card" key={index}><span className="research-step-number">{String(index + 1).padStart(2, "0")}</span><h3>{section.heading}</h3><RichText text={section.body} /></section>) : <p className="research-section-note">Reported mechanism not available in this saved entry.</p>}</div></>}
    </section>
    <section className="research-numbered-section" aria-labelledby="research-benefits" data-benefits>
      <div className="research-explanation-heading"><div><p className="research-section-eyebrow research-mono">03 · {source?.benefits.length ? "WHY PEOPLE USE IT" : "AREAS STUDIED"}</p><h2 id="research-benefits">{source?.benefits.length ? "The benefits" : "Research interests"}</h2></div></div>
      {source?.benefits.length ? <Cards cards={source.benefits} benefits /> : <div className="research-module-grid research-explanation-grid research-benefit-grid">{model.findings.length ? model.findings.map((finding, index) => <div className="research-note-card" key={index}><span className="research-interest-number research-mono">{String(index + 1).padStart(2, "0")}</span><RichText text={finding} /></div>) : <p className="research-section-note">Research findings not available in this saved entry.</p>}</div>}
    </section>
  </div>;
}