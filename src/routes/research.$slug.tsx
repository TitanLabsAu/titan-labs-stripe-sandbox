import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPublishedResearch } from "@/lib/research.functions";
import { pubchemUrl, safeUrl } from "@/lib/research";

const entryQuery = (slug: string) =>
  queryOptions({
    queryKey: ["research", "entry", slug],
    queryFn: () => getPublishedResearch({ data: { slug } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/research/$slug")({
  loader: async ({ context, params }) => {
    const entry = await context.queryClient.ensureQueryData(entryQuery(params.slug));
    if (!entry) throw notFound();
    return { title: entry.title, summary: entry.summary };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Not found | Titan's Research Lab" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} | Titan's Research Lab`;
    const desc = loaderData.summary.slice(0, 155) || `Research reference notes on ${loaderData.title}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: EntryNotFound,
  errorComponent: EntryNotFound,
  component: EntryPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-14">
        <Link to="/research" className="technical-label inline-flex items-center gap-2 text-primary">
          <ArrowLeft className="h-4 w-4" /> Titan's Research Lab
        </Link>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function EntryNotFound() {
  return (
    <Shell>
      <div className="industrial-panel mt-6 p-8 text-sm text-muted-foreground">This research entry is not available.</div>
    </Shell>
  );
}

function EntryPage() {
  const { slug } = Route.useParams();
  const { data: e } = useSuspenseQuery(entryQuery(slug));
  if (!e) return <EntryNotFound />;
  const pubchem = pubchemUrl(e.pubchem_cid);
  const identifiers = [
    ["Molecular formula", e.molecular_formula],
    ["CAS number", e.cas_number],
    ["PubChem CID", e.pubchem_cid],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <Shell>
      <header className="mt-5">
        <p className="technical-label text-accent">{e.category || "Research"}</p>
        <h1 className="mt-1 text-3xl font-medium uppercase text-foreground sm:text-4xl">{e.title}</h1>
        {e.synonyms.length ? <p className="mt-2 text-sm text-muted-foreground">Also known as: {e.synonyms.join(", ")}</p> : null}
        {e.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {e.tags.map((t) => (
              <span key={t} className="border border-border bg-background px-2 py-0.5 text-[0.65rem] font-bold uppercase text-foreground">{t}</span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-8">
          {e.summary ? (
            <section className="industrial-panel border-l-2 border-l-primary p-6">
              <h2 className="technical-label text-foreground">Summary</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{e.summary}</p>
            </section>
          ) : null}
          {e.content.map((s, i) => (
            <section key={i} className="industrial-panel p-6">
              {s.heading ? <h2 className="font-display text-lg font-extrabold uppercase text-foreground">{s.heading}</h2> : null}
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{s.body}</p>
            </section>
          ))}
          {e.research_findings.length ? (
            <section className="industrial-panel p-6">
              <h2 className="font-display text-lg font-extrabold uppercase text-foreground">Research findings</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {e.research_findings.map((f, i) => (
                  <li key={i} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" />{f}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {e.source_references.length ? (
            <section className="industrial-panel p-6">
              <h2 className="font-display text-lg font-extrabold uppercase text-foreground">References</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                {e.source_references.map((r, i) => {
                  const href = safeUrl(r.url);
                  const meta = [r.source, r.year].filter(Boolean).join(", ");
                  return (
                    <li key={i}>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                          {r.title || href} <ExternalLink className="inline h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-bold text-foreground">{r.title}</span>
                      )}
                      {meta ? <span> — {meta}</span> : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:col-span-4">
          {identifiers.length || e.sequence ? (
            <section className="industrial-panel p-6">
              <h2 className="technical-label text-foreground">Identifiers</h2>
              <dl className="mt-3 space-y-3 text-sm">
                {identifiers.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-mono font-bold text-foreground">
                      {k === "PubChem CID" && pubchem ? (
                        <a href={pubchem} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{v}</a>
                      ) : v}
                    </dd>
                  </div>
                ))}
                {e.sequence ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Sequence</dt>
                    <dd className="break-all font-mono text-xs text-foreground">{e.sequence}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}
          <p className="border border-border bg-card p-4 text-xs leading-5 text-muted-foreground">
            Research reference only. Not medical advice. Products supplied by Titan Labs Australia are for laboratory
            research use only and are not for human or animal consumption.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
