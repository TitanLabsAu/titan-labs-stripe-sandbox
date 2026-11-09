import { Minus, Plus, Trash2 } from "lucide-react";
import { CatalogueProductImage } from "@/components/RangeProductArt";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart";
import { formatPrice, variantStockFor, type Product } from "@/lib/products";

export function CheckoutOrderItems({
  items,
  giftChoices,
  locked,
  getProduct,
  getLinePrice,
  getLineLabel,
  setQuantity,
  removeItem,
  setGiftSelected,
}: {
  items: CartItem[];
  giftChoices: { id: string; label: string; quantity: number; selected: boolean }[];
  locked: boolean;
  getProduct: (slug: string) => Product | undefined;
  getLinePrice: (item: CartItem) => number;
  getLineLabel: (item: CartItem, product?: Product) => string;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  setGiftSelected: (id: string, selected: boolean) => void;
}) {
  return (
    <ul className="mt-5 divide-y divide-border">
      {giftChoices.map((gift) => (
        <li key={gift.id} className="py-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={gift.selected}
              disabled={locked}
              onChange={(e) => setGiftSelected(gift.id, e.target.checked)}
            />
            Include free: {gift.quantity} × {gift.label}
          </label>
        </li>
      ))}
      {items.map((item) => {
        const product = getProduct(item.slug);
        const variant = product?.variants?.find((v) => v.id === item.variantId);
        const name = product?.name ?? item.slug;
        const label = getLineLabel(item, product);
        const description = `${name}, ${label}`;
        const linePrice = getLinePrice(item);
        const giftValue = (variant?.price ?? product?.wasPrice ?? product?.price ?? 0) * item.quantity;
        const stock = product ? variantStockFor(product, item.variantId) : null;
        const unitsInOrder = items.reduce((total, line) =>
          line.slug === item.slug && (line.variantId ?? null) === (item.variantId ?? null)
            ? total + line.quantity
            : total, 0);
        const canIncrease = Boolean(product) && !product?.comingSoon && !variant?.comingSoon &&
          item.quantity < 99 && (stock == null || unitsInOrder < stock);
        return (
          <li key={item.key} className="flex items-start gap-3 py-4">
            {product ? (
              <CatalogueProductImage
                product={product}
                variant={variant}
                alt={product.alt}
                className="h-12 w-12 shrink-0 rounded object-cover sm:h-14 sm:w-14"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold uppercase text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.freeGift ? `${item.quantity} complimentary` : `${formatPrice(linePrice)} each`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {item.freeGift ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {giftValue > 0 ? <s className="text-xs text-muted-foreground">{formatPrice(giftValue)}</s> : null}
                      <span className="rounded border border-accent/60 bg-accent/15 px-2 py-0.5 text-xs font-extrabold tracking-wider text-foreground">FREE</span>
                    </div>
                  ) : (
                    <span className="font-extrabold text-accent">{formatPrice(linePrice * item.quantity)}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!item.freeGift ? (
                  <div role="group" aria-label={`Quantity for ${description}`} className="inline-flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={locked} aria-label={`Decrease quantity of ${description}`} onClick={() => setQuantity(item.key, item.quantity - 1)}>
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <span className="min-w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">{item.quantity}</span>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled={locked || !canIncrease} aria-label={`Increase quantity of ${description}`} onClick={() => setQuantity(item.key, item.quantity + 1)}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
                <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground hover:text-destructive" disabled={locked} aria-label={`Remove ${description}`} onClick={() => removeItem(item.key)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
