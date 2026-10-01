import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ResearchIndexView } from "@/components/ResearchIndexView";
import { ResearchLabShell } from "@/components/ResearchLabShell";
import { listResearchPreview } from "@/lib/research.functions";

const previewQuery = queryOptions({
  queryKey: ["research", "admin-preview", "list"],
  queryFn: () => listResearchPreview(),
  staleTime: 15_000,
});

export const Route = createFileRoute("/_authenticated/research-preview/")({
  head: () => ({ meta: [
    { title: "Research Lab member preview | Titan Labs Australia" },
    { name: "description", content: "Private preview of unpublished Research Lab entries." },
    { property: "og:title", content: "Research Lab member preview | Titan Labs Australia" },
    { property: "og:description", content: "Private preview of unpublished Research Lab entries." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(previewQuery),
  errorComponent: () => <ResearchLabShell preview><p className="text-muted-foreground">This preview is available to administrators only.</p></ResearchLabShell>,
  notFoundComponent: () => <ResearchLabShell preview><p className="text-muted-foreground">Preview not found.</p></ResearchLabShell>,
  component: ResearchPreviewIndex,
});

function ResearchPreviewIndex() {
  const { data: entries } = useSuspenseQuery(previewQuery);
  return <ResearchLabShell preview><ResearchIndexView entries={entries} preview /></ResearchLabShell>;
}
