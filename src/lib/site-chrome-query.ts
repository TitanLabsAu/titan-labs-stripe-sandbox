import { dehydrate, hydrate, queryOptions, type QueryClient, type DehydratedState } from "@tanstack/react-query";
import { getSiteContent, listSiteLinks } from "@/lib/catalog.functions";

export const siteContentQuery = queryOptions({
  queryKey: ["site-content"],
  queryFn: () => getSiteContent(),
  staleTime: 30_000,
});

export const siteLinksQuery = queryOptions({
  queryKey: ["site-links"],
  queryFn: () => listSiteLinks(),
  staleTime: 30_000,
});

// Resolve shared chrome before rendering, including a consistent transient
// fallback if the public read fails. Existing CMS fallback rules stay intact.
export async function loadSiteChrome(client: QueryClient) {
  await Promise.all([
    client.ensureQueryData(siteContentQuery).catch(() => {
      client.setQueryData(siteContentQuery.queryKey, {});
    }),
    client.ensureQueryData(siteLinksQuery).catch(() => {
      client.setQueryData(siteLinksQuery.queryKey, []);
    }),
  ]);
}

// Only public chrome is transferred here; member/commerce caches are untouched.
export function dehydrateSiteChrome(client: QueryClient) {
  return dehydrate(client, {
    shouldDehydrateQuery: (query) => query.state.status === "success" &&
      (query.queryKey[0] === "site-content" || query.queryKey[0] === "site-links"),
  });
}

export function hydrateSiteChrome(client: QueryClient, state: DehydratedState) {
  hydrate(client, state);
}