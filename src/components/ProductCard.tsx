import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { StarterKitOffer } from "@/components/StarterKitOffer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import {
  allComingSoon,
  allowsKit,
  singleLabelFor,
  firstAvailableVariant,
  isComingSoon,
  formatPrice,
  getProductOption,
  sortedProductVariants,
  stockState,
  totalStockFor,
  variantStockFor,
  type Product,
  type ProductPack,
} from "@/lib/products";

export function ProductCard({ product: p }: { product: Product }) {
  const { addItem, items, setQuantity } = useCart();
  const variants = sortedProductVariants(p);
  const [variantId, setVariantId] = useState<string | null>(
    firstAvailableVariant(p)?.id ?? null,
  );
  const [pack, setPack] = useState<ProductPack>("single");
  const singleOption = getProductOption(p, variantId, "single");
  const kitOption = getProductOption(p, variantId, "kit");
  const kitAllowed = allowsKit(p);
  const option = pack === "kit" && kitAllowed ? kitOption : singleOption;
  const stockCount = variantStockFor(p, variantId);
  const stock = stockState(stockCount);
  const allOut = stockState(totalStockFor(p)) === "out";
  const soon = isComingSoon(p, variantId);
  const bannerSoon = allComingSoon(p);
  const inCart = items.find((i) => i.key === option.key);
  const vialsPer = option.pack === "kit" ? 10 : 1;
  const atMax =
    Boolean(inCart) &&
    ((stockCount != null && (inCart!.quantity + 1) * vialsPer > stockCount) ||
      inCart!.quantity >= 99);
  return (
    <article className="group grid min-h-48 grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/55 hover:shadow-glow sm:min-h-40 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <Link
        to="/product/$slug"
        params={{ slug: p.slug }}
        className="relative overflow-hidden border-r border-border bg-secondary/30"
      >
        <img
          src={p.image}
          alt={p.alt}
          loading="lazy"
          className={`h-full w-full object-cover transition duration-300 hover:scale-[1.02] ${allOut ? "opacity-40 grayscale" : ""}`}
        />
        {p.promoLabel && !bannerSoon ? (
          <span className="absolute left-2 top-2 border border-accent bg-accent px-2 py-0.5 text-[8px] font-bold uppercase text-accent-foreground">
            {p.promoLabel}
          </span>
        ) : null}
        {bannerSoon ? (
          <span className="absolute inset-x-0 bottom-0 bg-primary py-1 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
            Coming soon
          </span>
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Link
            to="/product/$slug"
            params={{ slug: p.slug }}
            className="min-w-0 font-display text-base font-bold uppercase tracking-wide text-foreground transition group-hover:text-primary"
          >
            {p.name}
          </Link>
          {(p.categories ?? []).length ? (
            <span className="self-start border border-border px-2 py-1 text-[8px] text-primary">
              {p.categories?.[0]}
            </span>
          ) : null}
        </div>
        <Link to="/product/$slug" params={{slug:p.slug}} className="mt-2 inline-flex min-h-7 w-fit items-center gap-1 text-xs font-semibold text-primary hover:underline"><BookOpen className="h-3 w-3"/>Product Info</Link>
        {soon && !bannerSoon ? (
          <span className="mt-2 inline-flex w-fit items-center border border-primary bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
            This size coming soon
          </span>
        ) : soon ? null : stock === "out" ? (
          <span className="mt-2 inline-flex w-fit items-center border border-destructive bg-destructive/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-destructive">
            Out of stock
          </span>
        ) : stock === "low" ? (
          <span className="mt-2 inline-flex w-fit items-center border border-accent bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
            Low stock — only {stockCount} left
          </span>
        ) : null}
        {variants.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1" aria-label={kitAllowed ? "Vial size" : "Size"}>
            {variants.map((variant) => {
              const soldOut = stockState(variant.stock ?? 0) === "out";
              const vSoon = Boolean(variant.comingSoon) && !p.comingSoon;
              return (
                <Button
                  key={variant.id}
                  type="button"
                  size="sm"
                  variant={variantId === variant.id ? "default" : "outline"}
                  className={`h-7 min-w-0 px-2 text-[9px] ${soldOut ? "opacity-60" : ""}`}
                  onClick={() => setVariantId(variant.id)}
                >
                  {variant.label}
                  {vSoon ? " · Soon" : soldOut ? " · Sold out" : ""}
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
            {singleLabelFor(p)}
          </p>
        )}
        {kitAllowed ? (
        <div
          className="mt-3 grid grid-cols-2 overflow-hidden border border-input divide-x divide-input"
          aria-label="Buy option"
        >
          {(
            [
              ["single", "Single vial", singleOption.unitPrice],
              ["kit", "10x Kit · 20% off", kitOption.unitPrice],
            ] as const
          ).map(([key, label, price]) => (
            <button
              key={key}
              type="button"
              aria-pressed={pack === key}
              onClick={() => setPack(key)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors ${pack === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <span className="truncate">{label}</span>
              <span className="text-[10px] font-bold">
                {formatPrice(price)}
              </span>
            </button>
          ))}
        </div>
        ) : null}
        <StarterKitOffer product={p}/>
        <div className="mt-3 flex items-baseline gap-1">
          {p.wasPrice && pack === "single" ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(p.wasPrice)}
            </span>
          ) : null}
          <span className="text-lg font-semibold text-foreground">
            {formatPrice(option.unitPrice)}
          </span>
        </div>
        {inCart && !soon ? (
          <div
            className="mt-auto grid h-10 w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] overflow-hidden border border-primary"
            aria-label="Quantity in order"
          >
            <button
              type="button"
              aria-label="Remove one"
              onClick={() => setQuantity(inCart.key, inCart.quantity - 1)}
              className="bg-primary text-lg font-bold text-primary-foreground hover:opacity-90"
            >
              −
            </button>
            <span
              className="flex items-center justify-center text-sm font-semibold text-foreground"
              aria-label={`${inCart.quantity} in order`}
            >
              {inCart.quantity}
            </span>
            <button
              type="button"
              aria-label="Add one"
              disabled={atMax}
              onClick={() =>
                addItem(p.slug, 1, {
                  variantId: option.variantId,
                  variantLabel: option.variantLabel,
                  pack: option.pack,
                })
              }
              className="bg-primary text-lg font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              +
            </button>
          </div>
        ) : (
          <Button
            className="mt-auto w-full"
            disabled={soon || stock === "out"}
            onClick={() =>
              addItem(p.slug, 1, {
                variantId: option.variantId,
                variantLabel: option.variantLabel,
                pack: option.pack,
              })
            }
          >
            {soon
              ? "Coming soon"
              : stock === "out"
                ? "Out of stock"
                : option.pack === "kit"
                  ? "Add kit to order"
                  : "Add to order"}
          </Button>
        )}
      </div>
    </article>
  );
}

