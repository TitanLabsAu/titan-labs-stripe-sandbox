import { SITE_ORIGIN } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ResearchIndexView } from "@/components/ResearchIndexView";
import { ResearchLabShell } from "@/components/ResearchLabShell";
import { listPublishedResearch } from "@/lib/research.functions";

const researchQuery = queryOptions({
  queryKey: ["research", "list"],
  queryFn: () => listPublishedResearch(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/research/")({
  head: () => ({ links: [{rel:"canonical",href:`${SITE_ORIGIN}/research`}],
    meta: [
      { title: "Titan Research Lab | Titan Labs Australia" },
      { name: "description", content: "Browse plain-language compound research summaries with evidence context, technical details and cited sources." },
      { property: "og:title", content: "Titan Research Lab | Titan Labs Australia" },
      { property: "og:description", content: "Compound research summaries with evidence context, technical details and cited sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(researchQuery),
  errorComponent: () => <ResearchLabShell><p className="text-muted-foreground">The Research Lab could not be loaded. Please try again.</p></ResearchLabShell>,
  notFoundComponent: () => <ResearchLabShell><p className="text-muted-foreground">Not found.</p></ResearchLabShell>,
  component: ResearchIndex,
});

function ResearchIndex() {
  const { data: entries } = useSuspenseQuery(researchQuery);
  return <ResearchLabShell><ResearchIndexView entries={entries} /></ResearchLabShell>;
}

