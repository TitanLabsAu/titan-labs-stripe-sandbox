import { useId, useState } from "react";
import { PenTool } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/useCatalog";
import {
  flowPenLine,
  kitOfferSource,
  penCompanionSource,
  v2PenProduct,
} from "@/lib/pen-companion";
import { RANGE_STARTER_KIT_SLUG, PEN_STARTER_KIT_SLUG } from "@/lib/starter-kits";
import { formatPrice, stockState, variantStockFor, type Product } from "@/lib/products";
import { normalizeCatalogueSection } from "@/lib/catalogue-sections";

/**
 * Range products: "Add V2 Reusable Pen" toggle with a labelled colour picker.
 * The pen line is flow-owned (source marker + distinct cart key), so changing
 * the colour replaces only this line and manually added pens are untouched.
 * While a pen is selected, the starter-kit offer switches to the Pen Starter
 * Kit; a kit added through this product's offer is swapped, never duplicated.
 */
export function PenCompanionOffer({ product }: { product: Product }) {
  const { products } = useProducts();
  const { items, addItem, removeItem } = useCart();
  const selectId = useId();
  const [open, setOpen] = useState(false);

  if (normalizeCatalogueSection(product.catalogueSection) !== "range") return null;
  const pen = v2PenProduct(products);
  if (!pen) return null;

  const source = penCompanionSource(product.slug);
  const current = flowPenLine(items, product.slug);
  const expanded = open || Boolean(current);

  const swapFlowKit = (fromSlug: string, toSlug: string | null) => {
    const kitLine = items.find((i) => i.source === kitOfferSource(product.slug) && i.slug === fromSlug);
    if (!kitLine) return;
    removeItem(kitLine.key);
    if (toSlug) {
      const kit = products.find((p) => p.slug === toSlug);
      if (kit)
        addItem(kit.slug, kitLine.quantity, {
          variantId: null,
          variantLabel: kit.name,
          pack: "single",
          source: kitOfferSource(product.slug),
        });
    }
  };

  const choose = (variantId: string) => {
    if (!variantId) return;
    const variant = (pen.variants ?? []).find((v) => v.id === variantId);
    if (!variant) return;
    if (stockState(variantStockFor(pen, variant.id)) === "out") return;
    if (current) removeItem(current.key);
    addItem(pen.slug, 1, {
      variantId: variant.id,
      variantLabel: variant.label,
      pack: "single",
      source,
    });
    // Pen selected: this product's offer-added Range Starter Kit becomes the Pen Starter Kit.
    swapFlowKit(RANGE_STARTER_KIT_SLUG, PEN_STARTER_KIT_SLUG);
    toast.success(`${pen.name} — ${variant.label} added to cart`);
  };

  const turnOff = () => {
    if (current) removeItem(current.key);
    // Pen removed: revert this product's offer-added Pen Starter Kit to the Range Starter Kit.
    swapFlowKit(PEN_STARTER_KIT_SLUG, RANGE_STARTER_KIT_SLUG);
    setOpen(false);
  };

  return (
    <div className="mt-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${selectId}-panel`}
        onClick={() => (expanded ? turnOff() : setOpen(true))}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
          current
            ? "border-accent bg-accent/10 text-foreground shadow-[inset_0_0_0_1px_var(--accent)]"
            : "border-primary/30 text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <PenTool aria-hidden="true" className="h-4 w-4" />
          {current ? "V2 Reusable Pen added" : "Add V2 Reusable Pen"}
        </span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded ? (
        <div id={`${selectId}-panel`} className="pt-3">
          <label
            htmlFor={selectId}
            className="block text-xs font-bold uppercase tracking-[0.16em] text-accent"
          >
            Select Pen
          </label>
          <select
            id={selectId}
            className="mt-2 h-11 w-full rounded-md border border-input bg-background px-2 text-[11px] font-semibold text-foreground"
            value={current?.variantId ?? ""}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="" disabled>
              Choose a colour…
            </option>
            {[...(pen.variants ?? [])].sort((a, b) => {
              const colours = ["blue", "purple", "grey"];
              const rank = (label: string) => {
                const index = colours.indexOf(label.trim().toLowerCase());
                return index < 0 ? colours.length : index;
              };
              return rank(a.label) - rank(b.label);
            }).map((v) => {
              const soldOut = stockState(variantStockFor(pen, v.id)) === "out";
              return (
                <option key={v.id} value={v.id} disabled={soldOut}>
                  {v.label} — {formatPrice(v.salePrice != null && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price)}
                  {soldOut ? " · Sold out" : ""}
                </option>
              );
            })}
          </select>
          {current ? (
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              {current.variantLabel} pen added to your cart. Choose another colour to change your selection.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
