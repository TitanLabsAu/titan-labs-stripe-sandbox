import { LIGHT_PRODUCT_IMAGES } from "./light-product-images";
import { optimizedProductImage } from "./product-image-delivery";
import optimized from "./optimized-product-images.json";

export type PhotoPair = { source?: string; image?: string };
export type ProductPhotoPair = PhotoPair & { slug?: string };
export type VariantPhotoPair = ProductPhotoPair & { variant_id?: string };
function localPath(src: string) {
  try {
    const u = new URL(src, "https://titanlabsaus.com");
    return u.origin === "https://titanlabsaus.com"
      ? u.pathname + u.search
      : src;
  } catch {
    return src;
  }
}
export function samePhoto(a: string, b: string) {
  return localPath(a) === localPath(b);
}
export function contentLightPhoto(src: string, pairs: PhotoPair[] = []) {
  return (
    pairs.find((p) => p.source && p.image && samePhoto(p.source, src))?.image ||
    null
  );
}
/** Shipped alternates belong to the original photo, never a later Admin upload or another colour. */
export function productLightPhoto(
  slug: string | undefined,
  src: string,
  variantId: string | undefined,
  products: ProductPhotoPair[] = [],
  variants: VariantPhotoPair[] = [],
  images: PhotoPair[] = [],
) {
  const exact = contentLightPhoto(src, images);
  if (exact) return exact;
  if (!slug) return null;
  if (variantId)
    return (
      variants.find(
        (p) =>
          p.slug?.trim() === slug &&
          p.variant_id?.trim() === variantId &&
          p.source &&
          samePhoto(p.source, src),
      )?.image || null
    );
  const explicit = products.find((p) => p.slug?.trim() === slug && p.image);
  if (explicit?.image) return explicit.image;
  const light = LIGHT_PRODUCT_IMAGES[slug];
  if (!light) return null;
  const optimizedSource = Object.values(optimized).find(
    (p) => p === `/images/product-optimized/${slug}.webp`,
  );
  const original = optimizedSource || light.replace("/product-light/", "/");
  return samePhoto(optimizedProductImage(src), original) ? light : null;
}
