import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/catalog.functions";
import { siteContentQuery, siteLinksQuery } from "@/lib/site-chrome-query";
import { products as fallbackProducts, type Product } from "@/lib/products";

export function useProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["catalog-products"],
    queryFn: () => listProducts(),
    staleTime: 30_000,
  });
  const list: Product[] = data ?? fallbackProducts;
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
