import type { Product, ProductVariant } from "./products";
import { sanitizeProductLinks } from "./product-certificates";
export type ProductInformationEntry = {
  product: string;
  details: string;
  included: string;
  care: string;
  shipping: string;
};
export function productInformation(
  product: Product,
  variant: ProductVariant | undefined,
  entries: ProductInformationEntry[] = [],
) {
  const saved = entries.find((e) => e.product === (product.id || product.slug));
  const defaults = {
    details: [product.description, ...(product.details || [])]
      .filter((s) => s?.trim())
      .join("\n\n"),
    included: (variant?.contents || [])
      .map((e) => `${e.quantity} × ${e.name}`)
      .join("\n"),
    care: product.protocol || "",
    shipping: "",
  };
  const fields = saved || defaults;
  return {
    details: fields.details?.trim() || "",
    included: fields.included?.trim() || "",
    care: fields.care?.trim() || "",
    shipping: fields.shipping?.trim() || "",
    documents: sanitizeProductLinks(product.links),
  };
}
