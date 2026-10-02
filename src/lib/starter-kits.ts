import { normalizeCatalogueSection } from "./catalogue-sections";
import { isComingSoon, stockState, type Product } from "./products";
import type { CartItem } from "./cart";

export const RANGE_STARTER_KIT_SLUG = "range-starter-kit";
export const PEN_STARTER_KIT_SLUG = "pen-starter-kit";
/** Kits are ordinary Equipment products, with a single inventory and authoritative checkout price. */
export function starterKitFor(product: Product, products: Product[]): Product | null {
  if (product.starterKitEnabled === false) return null;
  const section = normalizeCatalogueSection(product.catalogueSection);
  const slug =
    section === "range" ? RANGE_STARTER_KIT_SLUG : section === "pens" ? PEN_STARTER_KIT_SLUG : null;
  return (
    products.find(
      (p) => p.slug === slug && p.catalogueSection === "equipment" && !p.variants?.length,
    ) ?? null
  );
}
export function canAddStarterKit(kit: Product, items: CartItem[]): boolean {
  const count = items.filter((i) => i.slug === kit.slug).reduce((sum, i) => sum + i.quantity, 0);
  return (
    !isComingSoon(kit) &&
    stockState(kit.stock) !== "out" &&
    count < 99 &&
    (kit.stock == null || count < kit.stock)
  );
}
