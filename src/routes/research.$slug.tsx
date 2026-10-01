import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ResearchEntryView } from "@/components/ResearchEntryView";
import { ResearchLabShell } from "@/components/ResearchLabShell";
import { getPublishedResearch, listPublishedResearch } from "@/lib/research.functions";

const entryQuery = (slug: string) => queryOptions({
  queryKey: ["research", "entry", slug],
  queryFn: () => getPublishedResearch({ data: { slug } }),
  staleTime: 30_000,
});

export const Route = createFileRoute("/research/$slug")({
  loader: async ({ context, params }) => {
    const entry = await context.queryClient.ensureQueryData(entryQuery(params.slug));
    if (!entry) throw notFound();
    return { title: entry.title, summary: entry.at_a_glance || entry.summary };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Research entry unavailable | Titan Labs Australia" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.title} research overview | Titan Labs Australia`;
    const description = loaderData.summary.slice(0, 155);
    return { meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ] };
  },
  notFoundComponent: EntryUnavailable,
  errorComponent: EntryUnavailable,
  component: EntryPage,
});

function EntryUnavailable() {
  return <ResearchLabShell><div className="border border-border bg-card p-8 text-sm text-muted-foreground">This research entry is not available.</div></ResearchLabShell>;
}

function EntryPage() {
  const { slug } = Route.useParams();
  const { data: entry } = useSuspenseQuery(entryQuery(slug));
  if (!entry) return <EntryUnavailable />;
  const { data: entries } = useSuspenseQuery(queryOptions({ queryKey: ["research", "list"], queryFn: () => listPublishedResearch(), staleTime: 30_000 }));\n  return <ResearchLabShell><ResearchEntryView entry={entry} entries={entries} /></ResearchLabShell>;
}
