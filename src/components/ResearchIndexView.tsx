import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResearchEvidenceBadge } from "@/components/ResearchEvidenceBadge";
import { EVIDENCE_STATUSES, label, type ResearchEntry } from "@/lib/research";
import { entriesForCollection, RESEARCH_COLLECTIONS } from "@/lib/research-discovery";
import { TitanBlendsView } from "@/components/TitanBlendsView";

export function ResearchIndexView({ entries, preview = false }: { entries: ResearchEntry[]; preview?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null);
  const [evidence, setEvidence] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(entries.map((entry) => entry.category).filter(Boolean))).sort()], [entries]);
  const term = query.trim().toLowerCase();
  const selectedCollection = RESEARCH_COLLECTIONS.find((item) => item.slug === collectionSlug);
  const collectionEntries = selectedCollection ? entriesForCollection(entries, selectedCollection) : entries;
  const visible = collectionEntries.filter((entry) => {
    if (!selectedCollection && category !== "All" && entry.category !== category) return false;
    if (evidence !== "All" && entry.evidence_status !== evidence) return false;
    if (!term) return true;
    return [entry.title, entry.at_a_glance, entry.summary, entry.category, ...entry.tags, ...entry.synonyms].join(" ").toLowerCase().includes(term);
  });

  return (
    <>
      <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="technical-label text-accent">Explore · Understand · Go deeper</p>
          <h1 className="mt-2 text-3xl font-medium uppercase text-foreground sm:text-5xl">Understand the research. Faster.</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Start with a simple explanation, explore what researchers are studying, then open the science and references only when you want more detail.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-5 border-l-2 border-l-primary pl-5">
          <Stat label="Entries" value={entries.length} />
          <Stat label="Categories" value={Math.max(0, categories.length - 1)} />
          <Stat label="Showing" value={visible.length} />
        </dl>
      </div>

      <section id="collections" className="mt-8">
        <div className="flex items-end justify-between gap-4"><div><p className="technical-label text-primary">Research Collections</p><h2 className="mt-1 font-display text-2xl font-bold uppercase text-foreground">Browse by research area</h2></div></div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {RESEARCH_COLLECTIONS.map((collection) => { const Icon = collection.icon; const count = entriesForCollection(entries, collection).length; return (
            <button key={collection.slug} type="button" onClick={() => { setCollectionSlug(collection.slug); setCategory("All"); }} aria-pressed={collectionSlug === collection.slug} className={`group min-h-36 rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-glow sm:p-5 ${collectionSlug === collection.slug ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10"><Icon className="h-5 w-5 text-primary" /></span>
              <span className="mt-3 block font-display text-base font-bold uppercase text-foreground group-hover:text-primary">{collection.shortTitle}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{count} entries</span>
            </button>
          ); })}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(16rem,24rem)_minmax(11rem,14rem)_1fr] lg:items-start">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search compounds or research areas" className="h-11 pl-9" aria-label="Search the Research Lab" />
        </div>
        <label className="sr-only" htmlFor="research-evidence-filter">Filter by evidence level</label>
        <select id="research-evidence-filter" value={evidence} onChange={(event) => setEvidence(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="All">All evidence levels</option>
          {EVIDENCE_STATUSES.filter(([key]) => entries.some((entry) => entry.evidence_status === key)).map(([key]) => <option key={key} value={key}>{label(EVIDENCE_STATUSES, key)}</option>)}
        </select>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
          {categories.map((item) => (
            <Button key={item} size="sm" variant={item === category ? "default" : "outline"} className="h-11 shrink-0 font-bold uppercase sm:h-10" aria-pressed={item === category} onClick={() => { setCategory(item); setCollectionSlug(null); }}>
              {item}
            </Button>
          ))}
        </div>
      </div>

      {selectedCollection ? <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3"><p className="text-sm text-foreground"><span className="font-bold">{selectedCollection.title}</span> · {visible.length} matching entries</p><Button size="sm" variant="outline" onClick={() => setCollectionSlug(null)}>Clear</Button></div> : null}

      <div className="mt-8 flex items-center gap-2"><Layers3 className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold uppercase text-foreground">Compound Library</h2></div>

      {visible.length === 0 ? (
        <div className="mt-8 border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {entries.length === 0 ? "Research entries are being prepared. Check back soon." : "No entries match your search."}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((entry) => (
            <Link
              key={entry.id}
              to={preview ? "/research-preview/$slug" : "/research/$slug"}
              params={{ slug: entry.slug }}
              className="group flex min-h-72 flex-col border border-border bg-card p-5 shadow-sm transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="technical-label text-accent">{entry.category || "Research"}</p>
              <h2 className="mt-2 font-display text-xl font-bold uppercase text-foreground group-hover:text-primary">{entry.title}</h2>
              <ResearchEvidenceBadge status={entry.evidence_status} className="mt-4 self-start" />
              <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">{entry.at_a_glance || entry.summary}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 font-display text-xs font-bold uppercase text-primary">
                Read research overview <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}

      <section id="learn" className="mt-14 border-t border-border pt-10">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="technical-label text-accent">Understanding the evidence</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase text-foreground">Read the research with context</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Research level tells you what kind of evidence is cited for an entry. It is not a score for effectiveness, safety or suitability.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <EvidenceGuide title="Established clinical literature" body="A substantial clinical literature exists for specific studied or recognised contexts." />
            <EvidenceGuide title="Human clinical evidence" body="The compound has been studied in humans, but conclusions remain specific to those studies and populations." />
            <EvidenceGuide title="Limited human evidence" body="Some human research exists, but it is too limited to support broad conclusions." />
            <EvidenceGuide title="Preclinical evidence" body="Evidence is mainly from laboratory or animal research. Human effectiveness has not been established." />
            <EvidenceGuide title="Mixed / conflicting" body="Relevant findings are inconsistent or do not support one clear conclusion." />
            <EvidenceGuide title="Insufficient evidence" body="There is not enough direct evidence to establish the claimed effect or formulation." />
          </div>
        </div>
      </section>

      <section id="blends" className="mt-14 border-t border-border pt-10">
        <TitanBlendsView entries={entries} preview={preview} />
      </section>
    </>
  );
}

function EvidenceGuide({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-sm font-bold uppercase text-foreground">{title}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p></div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><dt className="technical-label text-muted-foreground">{label}</dt><dd className="font-display text-2xl font-bold text-foreground">{value}</dd></div>;
}