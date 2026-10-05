import { filterBySection, type CatalogueSection } from "@/lib/catalogue-sections";
import type { Product } from "@/lib/products";

/** Section-local selection prevents a moved/deleted/hidden product supplying the wrong tile. */
export function categoryTilePhoto(products: Product[], section: CatalogueSection, selectedSlug: unknown) {
  const choices = filterBySection(products, section).filter(p => Boolean(p.image?.trim()));
  return (choices.find(p => p.slug === selectedSlug) ?? choices[0])?.image;
}
