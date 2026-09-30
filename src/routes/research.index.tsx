import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { FlaskConical, Microscope, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listPublishedResearch } from "@/lib/research.functions";
import { cn } from "@/lib/utils";

const researchQuery = queryOptions({
  queryKey: ["research", "list"],
  queryFn: () => listPublishedResearch(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/research/")({
  head: () => ({
    meta: [
      { title: "Titan's Research Lab | Titan Labs Australia" },
      { name: "description", content: "Titan's Research Lab — a searchable reference library of research compounds, identifiers and published literature." },
      { property: "og:title", content: "Titan's Research Lab | Titan Labs Australia" },
      { property: "og:description", content: "Searchable research reference library with identifiers and published sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(researchQuery),
  errorComponent: () => <ResearchShell><p className="text-muted-foreground">The Research Lab could not be loaded. Please try again.</p></ResearchShell>,
  notFoundComponent: () => <ResearchShell><p className="text-muted-foreground">Not found.</p></ResearchShell>,
  component: ResearchIndex,
});

function ResearchShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-14">
        <div className="flex items-center gap-3">
          <Microscope className="h-7 w-7 text-primary" />
          <div>
            <p className="technical-label text-accent">Reference library</p>
            <h1 className="text-3xl font-medium uppercase text-foreground sm:text-4xl">Titan's Research Lab</h1>
          </div>
        </div>
        <div className="mt-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ResearchIndex() {
  const { data: entries } = useSuspenseQuery(researchQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(entries.map((e) => e.category).filter(Boolean))).sort()],
    [entries],
  );
  const term = q.trim().toLowerCase();
  const visible = entries.filter((e) => {
    if (cat !== "All" && e.category !== cat) return false;
    if (!term) return true;
    return [e.title, e.summary, e.category, ...e.tags, ...e.synonyms, e.cas_number ?? "", e.molecular_formula ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  return (
    <ResearchShell>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Structured reference notes on research compounds: identifiers, published findings and sources. Information is
        provided for laboratory research reference only and is not medical advice.
      </p>

      <div className="industrial-panel mt-6 grid grid-cols-3 gap-4 p-4">
        <Stat label="Entries" value={entries.length} />
        <Stat label="Categories" value={Math.max(0, categories.length - 1)} />
        <Stat label="Showing" value={visible.length} />
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, synonym, CAS number or tag"
          className="pl-9"
          aria-label="Search the Research Lab"
        />
      </div>

      {categories.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={c === cat ? "default" : "outline"}
              className="font-bold uppercase"
              aria-pressed={c === cat}
              onClick={() => setCat(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="industrial-panel mt-8 p-8 text-center text-sm text-muted-foreground">
          {entries.length === 0 ? "Research entries are being prepared. Check back soon." : "No entries match your search."}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((e) => (
            <Link
              key={e.id}
              to="/research/$slug"
              params={{ slug: e.slug }}
              className={cn("industrial-panel group flex flex-col border-l-2 border-l-primary p-5 transition-colors hover:border-primary")}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="technical-label text-accent">{e.category || "Research"}</p>
                <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
              </div>
              <h2 className="mt-2 font-display text-lg font-extrabold uppercase text-foreground group-hover:text-primary">
                {e.title}
              </h2>
              {e.synonyms.length ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">{e.synonyms.join(" · ")}</p>
              ) : null}
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{e.summary}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {e.cas_number ? <Chip>CAS {e.cas_number}</Chip> : null}
                {e.molecular_formula ? <Chip>{e.molecular_formula}</Chip> : null}
                {e.source_references.length ? <Chip>{e.source_references.length} sources</Chip> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </ResearchShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="technical-label text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="border border-border bg-background px-2 py-0.5 font-mono text-[0.65rem] text-foreground">{children}</span>;
}
