import { firstAvailableVariant, getProductOption, type Product, type ProductVariant } from "./products";

/** Display only. Saved product names, SKU labels and checkout prices stay authoritative. */
export function productDisplayName(product: Pick<Product, "name" | "catalogueSection">) {
  if (product.catalogueSection !== "range") return product.name;
  return product.name.replace(/\s*[-–—(]?\s*\d+(?:\.\d+)?\s*(?:mg|mcg|µg|μg|iu|ml|g)\s*\)?\s*$/i, "").trim() || product.name;
}

export function relatedProductPresentation(product: Product) {
  const variant = firstAvailableVariant(product) ?? undefined;
  return { variant, option: getProductOption(product, variant?.id ?? null, "single") };
}

/** Only this already-confirmed legacy label is clarified; unknown bare numbers are never assigned units. */
export function productDisplaySize(product: Pick<Product, "slug">, variant: Pick<ProductVariant, "label">) {
  return product.slug === "klow-80mg" && variant.label.trim() === "80" ? "80mg" : variant.label;
}
