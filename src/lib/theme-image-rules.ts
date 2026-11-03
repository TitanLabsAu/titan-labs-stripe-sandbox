import neutralToneSources from "./product-photo-tone-sources.json";
import shippedPairs from "./product-theme-pairs.json";
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
  return localPath(optimizedProductImage(a)) === localPath(optimizedProductImage(b));
}
/** Immutable artwork belongs to one exact source photo; changing an Admin photo opts out. */
export function shippedPhotoPair(src: string, slug?: string) {
  return shippedPairs.find(
    (p) => (!slug || p.slug === slug) && samePhoto(p.source, src),
  );
}
export function productDarkPhoto(slug: string | undefined, src: string) {
  return slug ? shippedPhotoPair(src, slug)?.dark || src : src;
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
  if (variantId) {
    const variant = variants.find(p => p.slug?.trim() === slug && p.variant_id?.trim() === variantId && p.source && samePhoto(p.source, src));
    if (variant?.image) return variant.image;
    const shipped = shippedPhotoPair(src, slug);
    if (shipped) return shipped.light;
    // Unknown colour uploads never fall through to a parent photo. Known originals
    // may still use their source-bound light counterpart for size-only options.
    const knownLight = LIGHT_PRODUCT_IMAGES[slug];
    const knownSource = knownLight?.replace("/product-light/", "/");
    return knownLight && knownSource && samePhoto(src, knownSource) ? knownLight : null;
  }
  const explicit = products.find((p) => p.slug?.trim() === slug && p.image);
  if (explicit?.image) return explicit.image;
  const shipped = shippedPhotoPair(src, slug);
  if (shipped) return shipped.light;
  const light = LIGHT_PRODUCT_IMAGES[slug];
  if (!light) return null;
  const legacySources: Record<string, string> = {
    "cjc-1295-without-dac-ipa-5mg":
      "/api/public/product-image?path=catalogue-v3%2Fcjc-1295-without-dac-ipa-5mg.png",
    kpv: "/api/public/product-image?path=catalogue-v3%2Fkpv.png",
    "reta-30":
      "/api/public/product-image?path=reta-30%2F1fbbee3a-f2e7-4778-9ab8-48c0c4a7d86c.webp",
  };
  if (legacySources[slug] && samePhoto(src, legacySources[slug]!)) return light;
  const optimizedSource = Object.values(optimized).find(
    (p) => p === `/images/product-optimized/${slug}.webp`,
  );
  const original = optimizedSource || light.replace("/product-light/", "/");
  return samePhoto(optimizedProductImage(src), original) ? light : null;
}


/** Only reviewed neutral equipment photos may tone old blue backdrop accents.
 * Blue/purple/grey pens and cases, and every later Admin upload, opt out. */
export function usesNeutralEquipmentTone(slug: string | undefined, src: string) {
  return Boolean(slug && neutralToneSources.some(p => p.slug === slug && samePhoto(p.source, src)));
}
