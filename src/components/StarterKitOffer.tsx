import { Link } from "@tanstack/react-router";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import { cmsValues } from "@/lib/storefrontContent";
import { useCart } from "@/lib/cart";
import { formatPrice, type Product } from "@/lib/products";
import { canAddStarterKit, starterKitFor } from "@/lib/starter-kits";

export function StarterKitOffer({ product }: { product: Product }) {
  const { products } = useProducts();
  const { items, addItem } = useCart();
  const c = cmsValues(useSiteContent().data, "starter_kit");
  const kit = starterKitFor(product, products);
  if (!kit) return null;
  const available = canAddStarterKit(kit, items);
  return (
    <details
      className="titan-kit-offer mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3"
      aria-label={`${kit.name} add-on`}
    >
      <summary className="cursor-pointer font-display text-sm font-bold text-foreground">{kit.name} · {formatPrice(kit.price)}</summary>
      <div className="pt-3">
      <Link
        to="/product/$slug"
        params={{ slug: kit.slug }}
        className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
      >
        <PackagePlus className="h-4 w-4" />
        {kit.name} · {formatPrice(kit.price)}
      </Link>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{kit.details.join(" · ")}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 w-full"
        disabled={!available}
        onClick={() => addItem(kit.slug, 1, { pack: "single" })}
      >
        {available ? c.add_label : kit.comingSoon ? c.coming_soon_label : c.unavailable_label}
      </Button>
      </div>
    </details>
  );
}
