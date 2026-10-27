import { loadCatalogProducts } from "@/lib/useCatalog";
import { SITE_ORIGIN, seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PenTool } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TitanPageHeading } from "@/components/TitanPageHeading";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/useCatalog";
import { filterBySection } from "@/lib/catalogue-sections";
export const Route = createFileRoute("/pens")({
  loader: ({ context }) => loadCatalogProducts(context.queryClient),
  head: () => seoHead("Disposable Pens | Titan Labs Aus", "Browse Titan Labs Aus disposable pens, view product details and available certificates, and compare pen options in the Titan Pen Guides.", `${SITE_ORIGIN}/pens`, "/images/titan-catalogue-banner.webp"),
  component: PensPage,
});
function PensPage() {
  const { products, isLoading } = useProducts();
  const pens = filterBySection(products, "pens");
  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-8 sm:py-12">
        <TitanPageHeading
          as="h1"
          icon={PenTool}
          eyebrow="Titan catalogue"
          title="Disposable Pens"
        />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Browse pre-filled research pens and the optional Pen Starter Kit. Availability is shown on
          each product.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/pen-guide">View pen guides</Link>
        </Button>
        <div className="titan-row-aligned mt-7 grid gap-4 lg:grid-cols-2">
          {pens.map((p) => (
            <ProductCard key={p.slug} product={p} aligned />
          ))}
        </div>
        {isLoading ? (
          <p className="mt-7 text-sm text-muted-foreground">Loading pens…</p>
        ) : !pens.length ? (
          <p className="mt-7 text-sm text-muted-foreground">
            No disposable pens are currently listed.
          </p>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
