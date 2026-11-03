import { useId } from "react";
import type { Product, ProductVariant } from "@/lib/products";
import { stockState, variantStockFor } from "@/lib/products";
import { ThemedProductImage } from "./ThemedImage";
export function PhotoColourSelector({
  product,
  variants,
  value,
  onChange,
  compact = false,
  disableUnavailable = false,
  disabledIds = [],
}: {
  product: Product;
  variants: ProductVariant[];
  value: string | null;
  onChange: (id: string) => void;
  compact?: boolean;
  disableUnavailable?: boolean;
  disabledIds?: readonly string[];
}) {
  const name = useId();
  return (
    <fieldset className="mt-3 min-w-0">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground">
        Colour
        {variants.find((v) => v.id === value)
          ? ` — ${variants.find((v) => v.id === value)!.label}`
          : ""}
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {variants.map((v) => {
          const out = stockState(variantStockFor(product, v.id)) === "out";
          const unavailable = v.comingSoon || product.comingSoon;
          return (
            <label
              key={v.id}
              className={`relative min-w-0 cursor-pointer rounded-lg border-2 bg-card p-1.5 text-center focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${value === v.id ? "border-primary" : "border-border hover:border-primary/60"}`}
            >
              <input
                className="sr-only"
                type="radio"
                disabled={disabledIds.includes(v.id) || (disableUnavailable && Boolean(out || unavailable))}
                name={name}
                value={v.id}
                checked={value === v.id}
                onChange={() => onChange(v.id)}
                aria-label={`${v.label}${unavailable ? " — Coming soon" : out ? " — Sold out" : ""}`}
              />
              <span
                className={`relative block overflow-hidden rounded aspect-square`}
              >
                <ThemedProductImage
                  slug={product.slug}
                  variantId={v.id}
                  src={v.image!}
                  alt=""
                  sizes={compact ? "100px" : "180px"}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="mt-1 block text-[11px] font-bold text-foreground">
                {v.label}
                {value === v.id ? (
                  <span aria-hidden="true" className="ml-1 text-primary">
                    ✓
                  </span>
                ) : null}
              </span>
              {unavailable || out ? (
                <span className="block text-[9px] text-muted-foreground">
                  {unavailable ? "Soon" : "Sold out"}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

