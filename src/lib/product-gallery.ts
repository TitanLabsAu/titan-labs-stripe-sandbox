import { usesRangeArtwork, RANGE_VIEWS, type RangeView } from "./range-artwork";
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
  rangeView?: RangeView;
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
/** Only V2 reusable pens have the three selectable detail views. */
export function isPenGallery(product: Pick<Product, "slug" | "name">) {
  return (
    ["titan-v2-reusable-pen", "v2-reusable-pen"].includes(product.slug) ||
    /\bv2\s+reusable\s+pen\b/i.test(product.name)
  );
}

/** Range uses the coordinated live-label set; V2 pens retain their exact colour galleries. */
export function productHighlights(
  product: Product,
  variant: ProductVariant | undefined,
  entries: GalleryEntry[] = [],
): HighlightPhoto[] {
  const source = variant?.image || product.image;
  if (usesRangeArtwork(product))
    return RANGE_VIEWS.map(({ view, label }) => ({
      src: source,
      label,
      scale: 1,
      x: 0.5,
      y: 0.5,
      custom: false,
      rangeView: view,
    }));
  if (!isPenGallery(product))
    return [
      {
        src: source,
        label: "Full product view",
        scale: 1,
        x: 0.5,
        y: 0.5,
        custom: false,
      },
    ];
  const key = product.id || product.slug;
  const exact = entries.find(
    (e) => e.product === key && e.variant === (variant?.id || ""),
  );
  const custom =
    exact ||
    (!hasPhotoColourOptions(product.variants || [])
      ? entries.find((e) => e.product === key && !e.variant)
      : undefined);
  const views = [
    { label: "Full pen view", scale: 1, x: 0.5, y: 0.5 },
    { label: "Dial close-up", scale: 3.5, x: 0.88, y: 0.46 },
    { label: "Logo close-up", scale: 4, x: 0.6, y: 0.49 },
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
    return [{ ...v, src: source, custom: false, ...(light ? { light } : {}) }];
  });
}
