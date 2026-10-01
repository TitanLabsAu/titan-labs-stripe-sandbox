import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResearchEvidenceBadge } from "@/components/ResearchEvidenceBadge";
import type { ResearchEntry } from "@/lib/research";

export function ResearchIndexView({ entries, preview = false }: { entries: ResearchEntry[]; preview?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...Array.from(new Set(entries.map((entry) => entry.category).filter(Boolean))).sort()], [entries]);
  const term = query.trim().toLowerCase();
  const visible = entries.filter((entry) => {
    if (category !== "All" && entry.category !== category) return false;
    if (!term) return true;
    return [entry.title, entry.at_a_glance, entry.summary, entry.category, ...entry.tags, ...entry.synonyms].join(" ").toLowerCase().includes(term);
  });

  return (
    <>
      <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-medium uppercase text-foreground sm:text-4xl">Browse compound research</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Plain-language research summaries with evidence context, technical detail and cited sources. Educational research information only—not a product-use guide or medical advice.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-5 border-l-2 border-l-primary pl-5">
          <Stat label="Entries" value={entries.length} />
          <Stat label="Categories" value={Math.max(0, categories.length - 1)} />
          <Stat label="Showing" value={visible.length} />
        </dl>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(16rem,24rem)_1fr] lg:items-start">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search compounds or research areas" className="h-11 pl-9" aria-label="Search the Research Lab" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
          {categories.map((item) => (
            <Button key={item} size="sm" variant={item === category ? "default" : "outline"} className="h-11 shrink-0 font-bold uppercase sm:h-10" aria-pressed={item === category} onClick={() => setCategory(item)}>
              {item}
            </Button>
          ))}
        </div>
      </div>

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
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><dt className="technical-label text-muted-foreground">{label}</dt><dd className="font-display text-2xl font-bold text-foreground">{value}</dd></div>;
}