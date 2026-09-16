import { Link } from "@tanstack/react-router";
import { formatPrice, type Product } from "@/lib/products";

export function ProductCard({ product: p }: { product: Product }) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="block overflow-hidden rounded-xl border border-border bg-card/70 transition-transform hover:-translate-y-1"
    >
      <div className="relative">
        <img src={p.image} alt={p.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        {p.promoLabel ? (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent-foreground">
            {p.promoLabel}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 p-5">
        <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">{p.name}</h3>
        <span className="text-right">
          {p.wasPrice ? (
            <span className="mr-2 text-sm text-muted-foreground line-through">
              {formatPrice(p.wasPrice)}
            </span>
          ) : null}
          <span className="text-lg font-extrabold text-accent">{formatPrice(p.price)}</span>
        </span>
      </div>
      {(p.categories ?? []).length > 0 ? (
        <p className="px-5 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {(p.categories ?? []).join(" · ")}
        </p>
      ) : null}
      <p className="px-5 pb-5 text-xs uppercase tracking-[0.2em] text-accent">View &amp; buy →</p>
    </Link>
  );
}
