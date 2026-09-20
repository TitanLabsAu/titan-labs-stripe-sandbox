import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatPrice, getProductOption, hasVariantPricing, productBasePrice, type Product } from "@/lib/products";

export function ProductCard({ product: p }: { product: Product }) {
  const { addItem } = useCart();
  const fromPrice = productBasePrice(p);
  const hasSizes = hasVariantPricing(p);
  const firstVariant = p.variants?.[0] ?? null;
  const option = getProductOption(p, firstVariant?.id ?? null, "single");
  return (
    <article className="grid min-h-48 grid-cols-[7rem_minmax(0,1fr)] border border-border bg-card shadow-sm sm:min-h-40 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <Link to="/product/$slug" params={{ slug: p.slug }} className="relative overflow-hidden border-r border-border">
        <img src={p.image} alt={p.alt} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]" />
        {p.promoLabel ? (
          <span className="absolute left-2 top-2 border border-accent bg-accent px-2 py-0.5 text-[8px] font-bold uppercase text-accent-foreground">
            {p.promoLabel}
          </span>
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Link to="/product/$slug" params={{ slug: p.slug }} className="min-w-0 text-sm font-semibold text-foreground hover:text-primary">{p.name}</Link>
          {(p.categories ?? []).length ? <span className="self-start border border-border px-2 py-1 text-[8px] text-primary">{p.categories?.[0]}</span> : null}
        </div>
        <p className="mt-2 text-[10px] font-semibold text-muted-foreground">{firstVariant?.label ?? "Single vial"}</p>
        <div className="mt-4 flex items-baseline gap-1">
          {p.wasPrice ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(p.wasPrice)}
            </span>
          ) : null}
          <span className="text-lg font-semibold text-foreground">
            {hasSizes ? `From ${formatPrice(fromPrice)}` : formatPrice(p.price)}
          </span>
        </div>
        <Button className="mt-auto w-full" onClick={() => addItem(p.slug, 1, { variantId: option.variantId, variantLabel: option.variantLabel, pack: option.pack })}>Add to order</Button>
      </div>
    </article>
  );
}
