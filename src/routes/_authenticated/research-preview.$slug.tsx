import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ResearchEntryView } from "@/components/ResearchEntryView";
import { ResearchLabShell } from "@/components/ResearchLabShell";
import { getResearchPreview } from "@/lib/research.functions";

const previewEntryQuery = (slug: string) => queryOptions({
  queryKey: ["research", "admin-preview", "entry", slug],
  queryFn: () => getResearchPreview({ data: { slug } }),
  staleTime: 15_000,
});

export const Route = createFileRoute("/_authenticated/research-preview/$slug")({
  head: () => ({ meta: [
    { title: "Research entry member preview | Titan Labs Australia" },
    { name: "description", content: "Private preview of an unpublished Research Lab entry." },
    { property: "og:title", content: "Research entry member preview | Titan Labs Australia" },
    { property: "og:description", content: "Private preview of an unpublished Research Lab entry." },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  loader: async ({ context, params }) => {
    const entry = await context.queryClient.ensureQueryData(previewEntryQuery(params.slug));
    if (!entry) throw notFound();
  },
  errorComponent: EntryPreviewUnavailable,
  notFoundComponent: EntryPreviewUnavailable,
  component: ResearchEntryPreview,
});

function EntryPreviewUnavailable() {
  return <ResearchLabShell preview><div className="border border-border bg-card p-8 text-sm text-muted-foreground">This preview is not available.</div></ResearchLabShell>;
}

function ResearchEntryPreview() {
  const { slug } = Route.useParams();
  const { data: entry } = useSuspenseQuery(previewEntryQuery(slug));
  if (!entry) return <EntryPreviewUnavailable />;
  return <ResearchLabShell preview><ResearchEntryView entry={entry} preview /></ResearchLabShell>;
}
