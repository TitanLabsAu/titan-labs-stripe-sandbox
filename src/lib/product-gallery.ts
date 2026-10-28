import type { Product, ProductVariant } from "./products";
import { sanitizeVariantImage } from "./products";
export type GalleryEntry = {
  product: string;
  variant: string;
  image1: string;
  image2: string;
  image3: string;
  light1?: string;
  light2?: string;
  light3?: string;
};
export type HighlightPhoto = {
  src: string;
  label: string;
  scale: number;
  x: number;
  y: number;
  custom: boolean;
  light?: string;
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

/** Pens retain their three detail views; other products never invent extra photos from zoom crops. */
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
  const views = pen
    ? [
        { label: "Full pen view", scale: 1, x: 0.5, y: 0.5 },
        { label: "Dial close-up", scale: 3.5, x: 0.88, y: 0.46 },
        { label: "Logo close-up", scale: 4, x: 0.6, y: 0.49 },
      ]
    : [
        { label: "Full product view", scale: 1, x: 0.5, y: 0.5 },
        { label: "Label detail", scale: 1, x: 0.5, y: 0.5 },
        { label: "Titan Labs product box", scale: 1, x: 0.5, y: 0.5 },
      ];
  return views.flatMap<HighlightPhoto>((v, i) => {
    const photo = sanitizeVariantImage(
      custom?.[`image${i + 1}` as keyof GalleryEntry],
    );
    const light = sanitizeVariantImage(
      custom?.[`light${i + 1}` as keyof GalleryEntry],
    );
    if (photo)
      return [
        {
          ...v,
          src: photo,
          scale: 1,
          x: 0.5,
          y: 0.5,
          custom: true,
          ...(light ? { light } : {}),
        },
      ];
    return pen || i === 0
      ? [{ ...v, src: source, custom: false, ...(light ? { light } : {}) }]
      : [];
  });
}
