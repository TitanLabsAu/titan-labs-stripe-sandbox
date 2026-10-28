import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { dehydrateSiteChrome, hydrateSiteChrome } from "@/lib/site-chrome-query";

// After a new build, an already-open tab may request page files that no longer
// exist. Reload once to fetch the current version instead of showing a blank screen.
if (typeof window !== "undefined" && !(window as { __staleChunkGuard?: boolean }).__staleChunkGuard) {
  (window as { __staleChunkGuard?: boolean }).__staleChunkGuard = true;
  const KEY = "titan-stale-chunk-reload";
  const isChunkError = (msg: unknown) =>
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(String(msg ?? ""));
  const reloadOnce = () => {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  };
  window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); reloadOnce(); });
  window.addEventListener("unhandledrejection", (e) => {
    if (isChunkError((e.reason as Error)?.message ?? e.reason)) reloadOnce();
  });
  window.addEventListener("error", (e) => { if (isChunkError(e.message)) reloadOnce(); });
}

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
