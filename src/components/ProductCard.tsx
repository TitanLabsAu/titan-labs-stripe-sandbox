import { Link } from "@tanstack/react-router";
import { formatPrice, hasVariantPricing, productBasePrice, type Product } from "@/lib/products";

export function ProductCard({ product: p }: { product: Product }) {
  const fromPrice = productBasePrice(p);
  const hasSizes = hasVariantPricing(p);
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="industrial-panel group block overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-glow"
    >
      <div className="relative">
        <img src={p.image} alt={p.alt} loading="lazy" className="aspect-square w-full object-cover grayscale-[12%] transition duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]" />
        {p.promoLabel ? (
          <span className="brand-cut absolute left-1.5 top-1.5 border border-accent bg-accent px-2 py-0.5 text-[8px] font-extrabold uppercase text-accent-foreground sm:left-2 sm:top-2 sm:text-[9px]">
            {p.promoLabel}
          </span>
        ) : null}
      </div>
      <div className="p-2 sm:p-3">
        <h3 className="font-display text-xs font-bold uppercase leading-tight text-foreground">{p.name}</h3>
        <div className="mt-0.5 flex items-baseline gap-1">
          {p.wasPrice ? (
            <span className="text-[11px] text-muted-foreground line-through sm:text-xs">
              {formatPrice(p.wasPrice)}
            </span>
          ) : null}
          <span className="text-sm font-extrabold text-accent">
            {hasSizes ? `From ${formatPrice(fromPrice)}` : formatPrice(p.price)}
          </span>
        </div>
      </div>
      {(p.categories ?? []).length > 0 ? (
        <p className="px-2 pb-1 text-[9px] uppercase text-muted-foreground sm:px-3 sm:text-[9px]">
          {(p.categories ?? []).join(" · ")}
        </p>
      ) : null}
      <p className="border-t border-border px-2 py-2 text-[10px] font-bold uppercase text-primary sm:px-3 sm:text-[10px]">View product →</p>
    </Link>
  );
}
