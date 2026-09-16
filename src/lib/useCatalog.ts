import { useQuery } from "@tanstack/react-query";
import { getSiteContent, listProducts, listSiteLinks } from "@/lib/catalog.functions";
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
  return useQuery({
    queryKey: ["site-links"],
    queryFn: () => listSiteLinks(),
    staleTime: 30_000,
  });
}

export function useSiteContent() {
  return useQuery({
    queryKey: ["site-content"],
    queryFn: () => getSiteContent(),
    staleTime: 30_000,
  });
}
