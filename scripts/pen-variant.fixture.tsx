import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { CartProvider, useCart } from "../src/lib/cart";
import { ProductCard } from "../src/components/ProductCard";
import { listProducts, getSiteContent } from "../src/lib/catalog.functions";

let removeReviewItem: ((key: string) => void) | undefined;
export function removeFixtureItem(key: string) { removeReviewItem?.(key); }

/** Real public catalogue/cards/cart, no settings or product writes. Extra copy tests synchronization. */
export async function mountPenVariantFixture() {
  const products = await listProducts(); const content = await getSiteContent();
  const product = products.find(p => p.slug === "retatrutide");
  if (!product) throw Error("Retatrutide unavailable");
  const twenty = product.variants?.find(v => v.label === "20mg"), thirty = product.variants?.find(v => v.label === "30mg");
  if (!twenty || !thirty) throw Error("Requested sizes unavailable");
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  qc.setQueryData(["catalog-products"], products); qc.setQueryData(["site-content"], content);
  const cards = [twenty, thirty, thirty];
  function Page() {
    const { items, count, removeItem } = useCart();
    removeReviewItem = removeItem;
    return <main className="bg-background p-4 text-foreground"><h1 className="font-display text-xl font-bold">Variant companion review</h1><output aria-label="Cart count">{count}</output>
      <div className="hot-products-band mt-4 overflow-x-auto"><div className="promotions-track">{cards.map((v, i) => <div key={i} data-review-card={`${v.label}-${i}`} className="promotions-slide min-w-0 pl-4"><ProductCard aligned product={{ ...product, variants: [v] }} /></div>)}</div></div>
      <pre aria-label="Actual cart contents" className="mt-4 whitespace-pre-wrap break-all text-xs">{JSON.stringify(items, null, 2)}</pre>
    </main>;
  }
  const route = createRootRoute({ component: () => <QueryClientProvider client={qc}><CartProvider><Page /></CartProvider></QueryClientProvider> });
  const router = createRouter({ routeTree: route });
  const host = document.createElement("div"); document.body.replaceChildren(host); createRoot(host).render(<RouterProvider router={router} />);
}