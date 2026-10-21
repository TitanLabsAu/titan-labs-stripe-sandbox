import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { useProducts } from "@/lib/useCatalog";
import { researchProducts } from "@/lib/research-products";
import { safeUrl } from "@/lib/research";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVIDENCE_STATUSES, label, type ResearchEntry } from "@/lib/research";
import { entriesForCollection, RESEARCH_COLLECTIONS } from "@/lib/research-discovery";
import { TitanBlendsView } from "@/components/TitanBlendsView";
import { ResearchSourceDescription, SourceAttributionNote } from "@/components/ResearchSourceDescription";

export function ResearchIndexView({
  entries,
  preview = false,
}: {
  entries: ResearchEntry[];
  preview?: boolean;
}) {
  const intro = cmsValues(useSiteContent().data, "page_intros");
  const { products } = useProducts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [collectionSlug, setCollectionSlug] = useState<string | null>(null);
  const [evidence, setEvidence] = useState("All");
  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(entries.map((entry) => entry.category).filter(Boolean))).sort(),
    ],
    [entries],
  );
  const term = query.trim().toLowerCase();
  const selectedCollection = RESEARCH_COLLECTIONS.find((item) => item.slug === collectionSlug);
  const collectionEntries = selectedCollection
    ? entriesForCollection(entries, selectedCollection)
    : entries;
  const visible = collectionEntries.filter((entry) => {
    if (!selectedCollection && category !== "All" && entry.category !== category) return false;
    if (evidence !== "All" && entry.evidence_status !== evidence) return false;
    if (!term) return true;
    return [
      entry.title,
      entry.at_a_glance,
      entry.summary,
      entry.category,
      ...entry.tags,
      ...entry.synonyms,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  return (
    <>
      <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="technical-label text-accent">{intro.research_eyebrow}</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,9vw,3rem)] font-black uppercase leading-none tracking-[0.055em] text-foreground sm:text-5xl sm:tracking-[0.08em]">
            {intro.research_title}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            <span className="whitespace-pre-line">{intro.research_intro}</span>
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-5 border-l-2 border-l-primary pl-5">
          <Stat label="Entries" value={entries.length} />
          <Stat label="Categories" value={Math.max(0, categories.length - 1)} />
          <Stat label="Showing" value={visible.length} />
        </dl>
      </div>

      <section id="collections" className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="technical-label text-primary">Research Collections</p>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase text-foreground">
              Browse by research area
            </h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {RESEARCH_COLLECTIONS.map((collection) => {
            const Icon = collection.icon;
            const count = entriesForCollection(entries, collection).length;
            return (
              <button
                key={collection.slug}
                type="button"
                onClick={() => {
                  setCollectionSlug(collection.slug);
                  setCategory("All");
                }}
                aria-pressed={collectionSlug === collection.slug}
                className={`group min-h-36 rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-glow sm:p-5 ${collectionSlug === collection.slug ? "border-primary ring-1 ring-primary/30" : "border-border"}`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <span className="mt-3 block font-display text-base font-bold uppercase text-foreground group-hover:text-primary">
                  {collection.shortTitle}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {count} entries
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(16rem,24rem)_minmax(11rem,14rem)_1fr] lg:items-start">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search compounds or research areas"
            className="h-11 pl-9"
            aria-label="Search the Research Lab"
          />
        </div>
        <label className="sr-only" htmlFor="research-evidence-filter">
          Filter by evidence level
        </label>
        <select
          id="research-evidence-filter"
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="All">All evidence levels</option>
          {EVIDENCE_STATUSES.filter(([key]) =>
            entries.some((entry) => entry.evidence_status === key),
          ).map(([key]) => (
            <option key={key} value={key}>
              {label(EVIDENCE_STATUSES, key)}
            </option>
          ))}
        </select>
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter by category"
        >
          {categories.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={item === category ? "default" : "outline"}
              className="h-11 shrink-0 font-bold uppercase sm:h-10"
              aria-pressed={item === category}
              onClick={() => {
                setCategory(item);
                setCollectionSlug(null);
              }}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      {selectedCollection ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-sm text-foreground">
            <span className="font-bold">{selectedCollection.title}</span> · {visible.length}{" "}
            matching entries
          </p>
          <Button size="sm" variant="outline" onClick={() => setCollectionSlug(null)}>
            Clear
          </Button>
        </div>
      ) : null}

      <div className="mt-8 flex items-center gap-2">
        <Layers3 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold uppercase text-foreground">
          Compound Library
        </h2>
      </div>
      <SourceAttributionNote className="mt-2 max-w-3xl" />

      {visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-primary/25 bg-card/90 p-8 text-center shadow-glow text-sm text-muted-foreground">
          {entries.length === 0
            ? "Research entries are being prepared. Check back soon."
            : "No entries match your search."}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-primary/25 bg-card/90 p-5 shadow-glow"
            >
              <p className="technical-label text-accent">{entry.category || "Research"}</p>
              <h2 className="mt-2 font-display text-xl font-bold uppercase">{entry.title}</h2>
              <ResearchSourceDescription entry={entry} entries={entries} />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {entry.at_a_glance || entry.summary}
              </p>
              <details className="mt-4 border-t border-border pt-3">
                <summary className="cursor-pointer text-xs font-bold uppercase text-primary">
                  Expand research notes & references
                </summary>
                {entry.research_findings.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-muted-foreground">
                    {entry.research_findings.map((finding, i) => (
                      <li key={i}>{finding}</li>
                    ))}
                  </ul>
                ) : null}
                <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {entry.source_references.map((ref, i) => (
                    <li key={i}>
                      {safeUrl(ref.url) ? (
                        <a
                          href={safeUrl(ref.url)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {ref.title || ref.source}
                        </a>
                      ) : (
                        ref.title || ref.source
                      )}
                      {ref.year ? ` (${ref.year})` : ""}
                    </li>
                  ))}
                </ul>
              </details>
              <Link
                to={preview ? "/research-preview/$slug" : "/research/$slug"}
                params={{ slug: entry.slug }}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase text-primary"
              >
                Read full research <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-2 flex flex-wrap gap-2">
                {researchProducts(entry, products).map((p) => (
                  <Button key={p.slug} asChild variant="outline" size="sm">
                    <Link to="/product/$slug" params={{ slug: p.slug }}>
                      View {p.name}
                    </Link>
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <section id="learn" className="mt-14 border-t border-border pt-10">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="technical-label text-accent">Understanding the evidence</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase text-foreground">
              Read the research with context
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Research level tells you what kind of evidence is cited for an entry. It is not a
              score for effectiveness, safety or suitability.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <EvidenceGuide
              title="Established clinical literature"
              body="A substantial clinical literature exists for specific studied or recognised contexts."
            />
            <EvidenceGuide
              title="Human clinical evidence"
              body="The compound has been studied in humans, but conclusions remain specific to those studies and populations."
            />
            <EvidenceGuide
              title="Limited human evidence"
              body="Some human research exists, but it is too limited to support broad conclusions."
            />
            <EvidenceGuide
              title="Preclinical evidence"
              body="Evidence is mainly from laboratory or animal research. Human effectiveness has not been established."
            />
            <EvidenceGuide
              title="Mixed / conflicting"
              body="Relevant findings are inconsistent or do not support one clear conclusion."
            />
            <EvidenceGuide
              title="Insufficient evidence"
              body="There is not enough direct evidence to establish the claimed effect or formulation."
            />
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
  return (
    <div className="rounded-2xl border border-primary/20 bg-card/90 p-4">
      <p className="font-display text-sm font-bold uppercase text-foreground">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="technical-label text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl font-bold text-foreground">{value}</dd>
    </div>
  );
}
