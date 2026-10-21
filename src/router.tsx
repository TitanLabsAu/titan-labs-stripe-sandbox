import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { dehydrateSiteChrome, hydrateSiteChrome } from "@/lib/site-chrome-query";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    dehydrate: () => ({ siteChrome: JSON.stringify(dehydrateSiteChrome(queryClient)) }),
    hydrate: (state) => { hydrateSiteChrome(queryClient, JSON.parse(state.siteChrome)); },
  });

  return router;
};
