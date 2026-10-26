import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import { listProducts } from "@/lib/catalog.functions";
import { siteContentQuery, siteLinksQuery } from "@/lib/site-chrome-query";
import type { Product } from "@/lib/products";

// Public active catalogue; route loaders prime it so server HTML matches hydration.
export const catalogProductsQuery = queryOptions({
  queryKey: ["catalog-products"],
  queryFn: () => listProducts(),
  staleTime: 30_000,
});

/** Prime the public catalogue for SSR; a failed read falls back to a client refetch, never stale bundled data. */
export function loadCatalogProducts(client: QueryClient) {
  return client.ensureQueryData(catalogProductsQuery).then(() => undefined, () => undefined);
}

export function useProducts() {
  const { data, isLoading } = useQuery(catalogProductsQuery);
  const list: Product[] = data ?? [];
  return {
    products: list,
    isLoading,
    getProduct: (slug: string) => list.find((p) => p.slug === slug),
  };
}

export function useSiteLinks() {
  return useQuery(siteLinksQuery);
}

export function useSiteContent() {
  return useQuery(siteContentQuery);
}
