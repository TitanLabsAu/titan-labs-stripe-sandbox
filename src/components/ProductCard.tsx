import { Link } from "@tanstack/react-router";
import { formatPrice, hasVariantPricing, productBasePrice, type Product } from "@/lib/products";

export function ProductCard({ product: p }: { product: Product }) {
  const fromPrice = productBasePrice(p);
  const hasSizes = hasVariantPricing(p);
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="block overflow-hidden rounded-xl border border-border bg-card/70 transition-transform hover:-translate-y-1"
    >
      <div className="relative">
        <img src={p.image} alt={p.alt} loading="lazy" className="aspect-square w-full object-cover" />
        {p.promoLabel ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.15em] text-accent-foreground sm:left-2 sm:top-2 sm:text-[9px]">
            {p.promoLabel}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 p-2 sm:p-3">
        <h3 className="min-w-0 text-xs font-bold uppercase leading-tight tracking-tight text-foreground sm:text-xs">{p.name}</h3>
        <span className="shrink-0 text-right">
          {p.wasPrice ? (
            <span className="mr-1 text-[11px] text-muted-foreground line-through sm:text-xs">
              {formatPrice(p.wasPrice)}
            </span>
          ) : null}
          <span className="text-sm font-extrabold text-accent sm:text-sm">
            {hasSizes ? `From ${formatPrice(fromPrice)}` : formatPrice(p.price)}
          </span>
        </span>
      </div>
      {(p.categories ?? []).length > 0 ? (
        <p className="px-2 pb-1 text-[9px] uppercase tracking-[0.15em] text-muted-foreground sm:px-3 sm:text-[9px]">
          {(p.categories ?? []).join(" · ")}
        </p>
      ) : null}
      <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.15em] text-accent sm:px-3 sm:pb-3 sm:text-[10px]">View &amp; buy →</p>
    </Link>
  );
}
