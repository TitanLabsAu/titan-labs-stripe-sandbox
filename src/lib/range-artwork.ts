import { productDisplaySize } from "./product-presentation";
import type { Product, ProductVariant } from "./products";
import { normalizeCatalogueSection } from "./catalogue-sections";

export type RangeView = "vial" | "label" | "boxed";
export const RANGE_VIEWS: { view: RangeView; label: string }[] = [
  { view: "vial", label: "Full product" },
  { view: "label", label: "Label detail" },
  { view: "boxed", label: "Titan Labs box" },
];
export const RANGE_PALETTE = {
  navy: "#0C2D53",
  gold: "#F3BA56",
  white: "#FFFFFF",
};
export function usesRangeArtwork(
  product: Pick<Product, "catalogueSection" | "slug" | "name">,
) {
  return (
    normalizeCatalogueSection(product.catalogueSection) === "range" &&
    !["titan-v2-reusable-pen", "v2-reusable-pen"].includes(product.slug) &&
    !/\bv2\s+reusable\s+pen\b/i.test(product.name)
  );
}
const concentration = /\b\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+\s*(?:mg|mcg|µg|μg|iu|g)(?:\s*\/\s*(?:\d+(?:\.\d+)?\s*)?ml)?\b/i;
const quantity = /\d+(?:\.\d+)?\s*(?:mg|mcg|µg|μg|iu|ml|g)\b/gi;
/** Saved option text is authoritative. Never guess a strength or convert ml/IU to mg. */
export function rangeLabelDetails(
  product: Pick<Product, "name"> & Partial<Pick<Product, "slug" | "subDescription">>,
  variant?: Pick<ProductVariant, "label">,
) {
  const source = variant?.label.trim() || product.name;
  const savedConcentration = source.match(concentration)?.[0] || (!variant ? product.subDescription?.match(concentration)?.[0] : undefined);
  const sizes = source.match(quantity) ?? [];
  const matchingSize = /^\d+(?:\.\d+)?$/.test(variant?.label.trim() || "")
    ? product.name
        .match(quantity)
        ?.find((size) => Number.parseFloat(size) === Number(variant?.label))
    : undefined;
  const strength =
    savedConcentration?.replace(/\s+/g, "") ||
    matchingSize ||
    (sizes.length
      ? sizes.join(" / ").replace(/\s+(mg|mcg|µg|μg|iu|ml|g)\b/gi, "$1")
      : variant ? productDisplaySize({slug: product.slug || ""}, variant).trim() : "");
  const name =
    product.name
      .replace(concentration, "")
      .replace(
        /\s*[-–—(]?\s*\d+(?:\.\d+)?\s*(?:mg|mcg|µg|μg|iu|ml|g)\s*\)?\s*$/i,
        "",
      )
      .trim() || product.name;
  return { name, strength };
}

/** Source-bound BAC Water upgrade; later Admin photographs remain untouched. */
export function usesBacWaterArtwork(product: Pick<Product, "slug" | "image">) {
  if (product.slug !== "bac-water") return false;
  try {
    const u = new URL(product.image, "https://titanlabsaus.com");
    return u.origin === "https://titanlabsaus.com" && ((u.pathname === "/api/public/product-image" && u.searchParams.get("path") === "catalogue-v3/bac-water.png") || /^\/images\/(product-optimized|product-light)\/bac-water(?:-\d+)?\.webp$/.test(u.pathname));
  } catch { return false; }
}

