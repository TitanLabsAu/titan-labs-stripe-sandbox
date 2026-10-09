import type { ImgHTMLAttributes } from "react";
import { LIGHT_PRODUCT_IMAGES } from "@/lib/light-product-images";
import { productImageDelivery } from "@/lib/product-image-delivery";
import { canonicalUrl, cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { artDelivery } from "@/lib/theme-art";

export const LIGHT_DISCOVERY_ART = "/images/titan-discovery-light.webp";
const responsiveLightPhotos = new Set(Object.values(LIGHT_PRODUCT_IMAGES));

/** Resolved dark/light pair; the dark image is always the untouched original. */
export function themedArtPair(dark: string, light: string | undefined | null, fallback = LIGHT_DISCOVERY_ART) {
  return { dark, light: (light && canonicalUrl(light)) || fallback };
}

/** Light photo for this exact product slug, or null — never another product's photo. Theme-independent. */
export function useLightProductPhoto(slug: string | undefined) {
  const { data } = useSiteContent();
  if (!slug) return null;
  const list = (cmsValues(data, "theme_artwork").products ?? []) as { slug?: string; image?: string }[];
  const hit = list.find((r) => r?.slug?.trim() === slug && r.image && canonicalUrl(r.image));
  return hit?.image ? canonicalUrl(hit.image) : LIGHT_PRODUCT_IMAGES[slug] ?? null;
}

type ArtProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "loading"> & {
  dark: string;
  light: string;
  sizes: string;
  alt: string;
  /** Above-the-fold hero: high fetch priority for whichever variant the CSS shows. */
  priority?: boolean;
};

/**
 * Renders both variants; CSS on <html class="light|dark"> shows exactly one from first paint.
 * Both are loading="lazy", so the hidden (display:none) variant is never fetched until shown or preloaded.
 */
export function ThemedArt({ dark, light, sizes, alt, priority, className, ...rest }: ArtProps) {
  const pr = priority ? { fetchPriority: "high" as const } : {};
  return (
    <>
      <img {...rest} {...pr} src={dark} {...artDelivery(dark, sizes)} alt={alt} loading="lazy" decoding="async" data-theme-variant="dark" className={`theme-variant-dark ${className ?? ""}`} />
      <img {...rest} {...pr} src={light} {...artDelivery(light, sizes)} alt={alt} loading="lazy" decoding="async" data-theme-variant="light" className={`theme-variant-light ${className ?? ""}`} />
    </>
  );
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  slug: string | undefined;
  src: string;
  alt: string;
  sizes?: string;
};

export function ThemedProductImage({ slug, src, sizes, alt, className, loading, ...rest }: Props) {
  const light = useLightProductPhoto(slug);
  const darkDelivery = sizes ? productImageDelivery(src, sizes) : {};
  const cls = `titan-themed-photo ${className ?? ""}`;
  if (!light) {
    return <img {...rest} loading={loading} src={src} {...darkDelivery} alt={alt} className={cls} />;
  }
  // Only shipped photo pairs have a guaranteed 480px counterpart; arbitrary CMS uploads do not.
  const lightDelivery = responsiveLightPhotos.has(light) ? { srcSet: `${light.replace(/\.webp$/, "-480.webp")} 480w, ${light} 1024w`, sizes: sizes ?? "100vw" } : {};
  return (
    <>
      <img {...rest} loading="lazy" src={src} {...darkDelivery} alt={alt} data-theme-variant="dark" className={`theme-variant-dark ${cls}`} />
      <img {...rest} loading="lazy" src={light} {...lightDelivery} alt={alt} data-theme-variant="light" data-light-photo="true" className={`theme-variant-light ${cls}`} />
    </>
  );
}
