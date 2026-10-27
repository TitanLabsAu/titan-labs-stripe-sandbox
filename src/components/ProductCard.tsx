import { promotedPrice } from "@/lib/variant-promotions";
import { PROMOTION_BANNERS_KEY, parseBannerSettings, resolveBanner } from "@/lib/promotion-banners";
import { useSiteContent } from "@/lib/useCatalog";
import { PromotionRibbon } from "@/components/PromotionRibbon";
import { ThemedProductImage } from "@/components/ThemedImage";
import { ProductCoaLink } from "./ProductCertificates";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { StarterKitOffer } from "@/components/StarterKitOffer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { PenCompanionOffer } from "@/components/PenCompanionOffer";
import {
  allComingSoon,
  bundleSummary,
  packLabel,
  subDescriptionFor,
  firstAvailableVariant,
  isComingSoon,
  formatPrice,
  getProductOption,
  sortedProductVariants,
  stockState,
  totalStockFor,
  variantStockFor,
  type Product,
} from "@/lib/products";

function PromotionSlot({ aligned, name, children }: { aligned: boolean; name: string; children: ReactNode }) {
  return aligned ? <div data-promotion-slot={name}>{children}</div> : <>{children}</>;
}

export function ProductCard({ product: p, aligned = false }: { product: Product; aligned?: boolean }) {
  const { addItem, items, setQuantity } = useCart();
  const variants = sortedProductVariants(p);
  const [variantId, setVariantId] = useState<string | null>(
    variants.find(v => v.hotProduct && !isComingSoon(p, v.id) && stockState(variantStockFor(p, v.id)) !== "out")?.id ?? firstAvailableVariant(p)?.id ?? null,
  );
  const selectedVariant = (p.variants ?? []).find(v => v.id === variantId);
  const promoLabel = selectedVariant ? selectedVariant.promoLabel || (selectedVariant.hotProduct ? "Hot product" : (p.variants ?? []).some(v => typeof v.hotProduct === "boolean") ? "" : p.promoLabel || "") : p.promoLabel;
  const wasPrice = selectedVariant && promotedPrice(selectedVariant.price, selectedVariant.salePrice) < selectedVariant.price ? selectedVariant.price : selectedVariant ? null : p.wasPrice;
  const { data: content } = useSiteContent();
  const banner = resolveBanner(parseBannerSettings(content?.[PROMOTION_BANNERS_KEY]), selectedVariant ? `${p.slug}::${selectedVariant.id}` : p.slug, promoLabel, Boolean(wasPrice), Boolean(selectedVariant?.hotProduct));
  const option = getProductOption(p, variantId, "single");
  const stockCount = variantStockFor(p, variantId);
  const stock = stockState(stockCount);
  const allOut = stockState(totalStockFor(p)) === "out";
  const soon = isComingSoon(p, variantId);
  const bannerSoon = allComingSoon(p);
  const inCart = items.find((i) => i.key === option.key);
  const atMax =
    Boolean(inCart) &&
    ((stockCount != null && inCart!.quantity + 1 > stockCount) ||
      inCart!.quantity >= 99);
  return (
    <article className="titan-product-card group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-primary/25 bg-card transition hover:border-primary/65 hover:shadow-glow">
      <Link
        to="/product/$slug"
        params={{ slug: p.slug }}
        className="titan-product-photo relative block aspect-square overflow-hidden border-b border-primary/20 bg-[#030f19] titan-photo-frame"
      >
        {selectedVariant?.image ? (
          <img
            src={selectedVariant.image}
            alt={`${p.alt} — ${selectedVariant.label}`}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-contain transition duration-300 hover:scale-[1.02] ${allOut ? "opacity-40 grayscale" : ""}`}
          />
        ) : (
          <ThemedProductImage
            slug={p.slug}
            src={p.image}
            sizes="(min-width: 1280px) 320px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            alt={p.alt}
            loading="lazy"
            className={`h-full w-full object-contain transition duration-300 hover:scale-[1.02] ${allOut ? "opacity-40 grayscale" : ""}`}
          />
        )}
        {banner && !bannerSoon ? <PromotionRibbon banner={banner} /> : null}
        {bannerSoon ? (
          <span className="absolute inset-x-0 bottom-0 bg-primary py-1 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
            Coming soon
          </span>
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <div data-promotion-slot={aligned ? "title" : undefined} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Link
            to="/product/$slug"
            params={{ slug: p.slug }}
            className="min-w-0 font-display text-xl font-bold uppercase tracking-wide text-foreground transition group-hover:text-primary"
          >
            {p.name}
          </Link>
          {(p.categories ?? []).length ? (
            <span className="sr-only">
              {p.categories?.[0]}
            </span>
          ) : null}
        </div>
        <div data-promotion-slot={aligned ? "links" : undefined} className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1"><Link to="/product/$slug" params={{slug:p.slug}} className="inline-flex min-h-7 w-fit items-center gap-1 text-xs font-semibold text-primary hover:underline"><BookOpen className="h-3 w-3"/>Product Info</Link><ProductCoaLink product={p}/></div>
        <PromotionSlot aligned={aligned} name="metadata">
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
        {subDescriptionFor(p) ? <p className="mt-2 text-[10px] font-semibold text-muted-foreground">{subDescriptionFor(p)}</p> : null}
        </PromotionSlot>
        <PromotionSlot aligned={aligned} name="size">
        {variants.length > 0 ? (
          <label className="mt-2 grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 text-xs font-display uppercase tracking-wide">
          <span>Size</span>
          <select
            className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-[11px] font-semibold text-foreground"
            aria-label="Choose size"
            value={variantId ?? ""}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {variants.map((variant) => {
              const soldOut = stockState(variantStockFor(p, variant.id)) === "out";
              const vSoon = Boolean(variant.comingSoon) && !p.comingSoon;
              return (
                <option key={variant.id} value={variant.id}>
                  {packLabel(variant.label, variant.packSize)}
                  {vSoon ? " · Soon" : soldOut ? " · Sold out" : ""}
                </option>
              );
            })}
          </select>
          </label>
        ) : aligned ? <span aria-hidden="true" /> : null}
        </PromotionSlot>
        <PromotionSlot aligned={aligned} name="pen"><PenCompanionOffer key={variantId || "base"} product={p} variantId={variantId} /></PromotionSlot>
        <PromotionSlot aligned={aligned} name="inclusions">
        {(() => {
          const items = variants.find((v) => v.id === variantId)?.contents ?? [];
          return items.length ? (
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              <span className="font-bold text-primary">Includes: </span>
              {bundleSummary(items)}
            </p>
          ) : null;
        })()}
        </PromotionSlot>
        <PromotionSlot aligned={aligned} name="starter"><StarterKitOffer key={variantId || "base"} product={p} variantId={variantId}/></PromotionSlot>
        <div data-promotion-slot={aligned ? "price" : undefined} className="mt-2 flex items-baseline gap-1">
          {wasPrice ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(wasPrice!)}
            </span>
          ) : null}
          <span className="font-display text-2xl font-bold text-[#ccecff] titan-card-price">
            {formatPrice(option.unitPrice)}
          </span>
        </div>
        <PromotionSlot aligned={aligned} name="action">
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
            className="mt-2 w-full min-h-11"
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
                : "Add to order"}
          </Button>
        )}
        </PromotionSlot>
      </div>
    </article>
  );
}
