import { normalizeCatalogueSection } from "./catalogue-sections";
import type { Product } from "./products";
import type { CartItem } from "./cart";
import { PEN_STARTER_KIT_SLUG, RANGE_STARTER_KIT_SLUG } from "./starter-kits";

/** The live V2 Reusable Pen catalogue product (Pens section, colour variants). */
export const V2_PEN_SLUG = "v2-reusable-pen";

/** Cart-line source marker for a pen added through a Range product's "Add V2 Reusable Pen" flow. */
export function penCompanionSource(rangeSlug: string, variantId?: string | null) {
  return `pen-companion:${rangeSlug}:${variantId || "base"}`;
}

/** Cart-line source marker for a starter kit added through a product's kit offer. */
export function kitOfferSource(productSlug: string, variantId?: string | null) {
  return `kit-offer:${productSlug}:${variantId || "base"}`;
}

/**
 * The flow-owned pen line (any configured case product) for a Range product
 * option, if one is in the cart. Ownership is the source marker alone, so the
 * Hard Case and Travel Case share one slot and never both sit in the flow.
 */
export function flowPenLine(items: CartItem[], rangeSlug: string, variantId?: string | null): CartItem | null {
  const source = penCompanionSource(rangeSlug, variantId);
  return items.find((i) => i.source === source) ?? null;
}

/** The live V2 pen product with orderable colour variants, or null when unavailable. */
export function v2PenProduct(products: Product[]): Product | null {
  const p = products.find(
    (x) => x.slug === V2_PEN_SLUG && normalizeCatalogueSection(x.catalogueSection) === "pens",
  );
  return p && (p.variants ?? []).length > 0 ? p : null;
}

/**
 * Which starter kit a product's offer should show. A Range product with a
 * flow-owned V2 pen in the cart offers the Pen Starter Kit instead of the
 * Range Starter Kit, so the two kits are never both pushed by the flow.
 */
export function starterKitSlugFor(product: Product, items: CartItem[], variantId?: string | null): string | null {
  const section = normalizeCatalogueSection(product.catalogueSection);
  if (section === "pens") return PEN_STARTER_KIT_SLUG;
  if (section === "range")
    return flowPenLine(items, product.slug, variantId) ? PEN_STARTER_KIT_SLUG : RANGE_STARTER_KIT_SLUG;
  return null;
}
