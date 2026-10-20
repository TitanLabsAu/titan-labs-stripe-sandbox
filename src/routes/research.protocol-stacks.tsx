import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ResearchLabShell } from "@/components/ResearchLabShell";
import { ResearchProtocolStacks } from "@/components/ResearchProtocolStacks";
import { listPublishedResearch } from "@/lib/research.functions";
import { SITE_ORIGIN } from "@/lib/seo";

const publishedQuery = queryOptions({ queryKey: ["research", "list"], queryFn: () => listPublishedResearch(), staleTime: 30_000 });

export const Route = createFileRoute("/research/protocol-stacks")({
  validateSearch: (search: Record<string, unknown>) => ({ goal: typeof search.goal === "string" ? search.goal : "weight-loss" }),
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE_ORIGIN}/research/protocol-stacks` }],
    meta: [
      { title: "Protocol Stacks | Titan Research Lab" },
      { name: "description", content: "Explore six names-only compound topic groupings in Titan Research Lab. Educational references, not tested combinations or treatment instructions." },
      { property: "og:title", content: "Protocol Stacks | Titan Research Lab" },
      { property: "og:description", content: "Six educational compound topic groupings, with links only to published Research Lab entries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publishedQuery),
  component: ProtocolStacksPage,
  errorComponent: () => <ResearchLabShell><p className="text-muted-foreground">Protocol Stacks could not be loaded. Please try again.</p></ResearchLabShell>,
});

function ProtocolStacksPage() {
  const { data: entries } = useSuspenseQuery(publishedQuery);
  const { goal } = Route.useSearch();
  return <ResearchLabShell><ResearchProtocolStacks entries={entries} goalId={goal} /></ResearchLabShell>;
}