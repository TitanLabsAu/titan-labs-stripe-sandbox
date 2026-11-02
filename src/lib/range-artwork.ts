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
const quantity = /\d+(?:\.\d+)?\s*(?:mg|mcg|µg|μg|iu|ml|g)\b/gi;
/** Saved option text is authoritative. Never guess a strength or convert ml/IU to mg. */
export function rangeLabelDetails(
  product: Pick<Product, "name">,
  variant?: Pick<ProductVariant, "label">,
) {
  const sizes = (variant?.label.trim() || product.name).match(quantity) ?? [];
  const matchingSize = /^\d+(?:\.\d+)?$/.test(variant?.label.trim() || "")
    ? product.name
        .match(quantity)
        ?.find((size) => Number.parseFloat(size) === Number(variant?.label))
    : undefined;
  const strength =
    matchingSize ||
    (sizes.length
      ? sizes.join(" / ").replace(/\s+(mg|mcg|µg|μg|iu|ml|g)\b/gi, "$1")
      : variant?.label.trim() || "");
  const name =
    product.name
      .replace(
        /\s*[-–—(]?\s*\d+(?:\.\d+)?\s*(?:mg|mcg|µg|μg|iu|ml|g)\s*\)?\s*$/i,
        "",
      )
      .trim() || product.name;
  return { name, strength };
}
