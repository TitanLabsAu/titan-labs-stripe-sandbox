import { optimizedProductImage } from "./product-image-delivery";
import type { Product, ProductVariant } from "./products";
import { sanitizeVariantImage } from "./products";
export type GalleryEntry = {
  product: string;
  variant: string;
  image1: string;
  image2: string;
  image3: string;
};
export type HighlightPhoto = {
  src: string;
  label: string;
  scale: number;
  x: number;
  y: number;
  custom: boolean;
};
export function hasPhotoColourOptions(variants: ProductVariant[]) {
  return (
    variants.length > 1 &&
    variants.every(
      (v) =>
        Boolean(v.image) &&
        /^(blue|purple|grey|gray|black|white|gold|silver|red|green|pink|navy)$/i.test(
          v.label.trim(),
        ),
    )
  );
}
export function isPenGallery(product: Product) {
  return (
    product.catalogueSection === "pens" ||
    /(?:reusable|disposable)\s+pen\b/i.test(product.name)
  );
}

/** Three authentic views of this exact selected photo; custom photos never leak from another colour. */
export function productHighlights(
  product: Product,
  variant: ProductVariant | undefined,
  entries: GalleryEntry[] = [],
): HighlightPhoto[] {
  const source = variant?.image || product.image;
  const key = product.id || product.slug;
  const exact = entries.find(
    (e) => e.product === key && e.variant === (variant?.id || ""),
  );
  const custom =
    exact ||
    (!hasPhotoColourOptions(product.variants || [])
      ? entries.find((e) => e.product === key && !e.variant)
      : undefined);
  const pen = isPenGallery(product);
  const catalogueVial =
    product.catalogueSection === "range" &&
    optimizedProductImage(source).startsWith("/images/product-optimized/");
  const views = pen
    ? [
        { label: "Full pen view", scale: 1, x: 0.5, y: 0.5 },
        { label: "Dial close-up", scale: 3.5, x: 0.88, y: 0.46 },
        { label: "Logo close-up", scale: 4, x: 0.6, y: 0.49 },
      ]
    : [
        { label: "Full product view", scale: 1, x: 0.5, y: 0.5 },
        {
          label: "Product close-up",
          scale: 1.8,
          x: catalogueVial ? 0.73 : 0.5,
          y: catalogueVial ? 0.66 : 0.5,
        },
        {
          label: "Product detail",
          scale: 2.7,
          x: catalogueVial ? 0.73 : 0.5,
          y: catalogueVial ? 0.66 : 0.5,
        },
      ];
  return views.map((v, i) => {
    const photo = sanitizeVariantImage(
      custom?.[`image${i + 1}` as keyof GalleryEntry],
    );
    return photo
      ? { ...v, src: photo, scale: 1, x: 0.5, y: 0.5, custom: true }
      : { ...v, src: source, custom: false };
  });
}
