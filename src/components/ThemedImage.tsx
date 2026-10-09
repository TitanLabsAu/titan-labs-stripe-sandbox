import type { ImgHTMLAttributes } from "react";
import { LIGHT_PRODUCT_IMAGES } from "@/lib/light-product-images";
import { productImageDelivery } from "@/lib/product-image-delivery";
import { canonicalUrl, cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { useSiteTheme } from "@/lib/site-theme";

export const LIGHT_DISCOVERY_ART = "/images/titan-discovery-light.webp";

/** Picks light artwork only in the light theme; the dark image is always the untouched original. */
export function useThemedArt(dark: string, light: string | undefined | null, fallback = LIGHT_DISCOVERY_ART) {
  const { theme } = useSiteTheme();
  return theme === "light" ? (light && canonicalUrl(light)) || fallback : dark;
}

/** Light photo for this exact product slug, or null — never another product's photo. */
export function useLightProductPhoto(slug: string | undefined) {
  const { theme } = useSiteTheme();
  const { data } = useSiteContent();
  if (theme !== "light" || !slug) return null;
  const list = (cmsValues(data, "theme_artwork").products ?? []) as { slug?: string; image?: string }[];
  const hit = list.find((r) => r?.slug?.trim() === slug && r.image && canonicalUrl(r.image));
  return hit ? canonicalUrl(hit.image!) : LIGHT_PRODUCT_IMAGES[slug] ?? null;
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  slug: string | undefined;
  src: string;
  alt: string;
  sizes?: string;
};

export function ThemedProductImage({ slug, src, sizes, alt, className, ...rest }: Props) {
  const light = useLightProductPhoto(slug);
  const finalSrc = light ?? src;
  const delivery = light?.startsWith("/images/product-light/") ? { srcSet: `${light.replace(/\.webp$/, "-480.webp")} 480w, ${light} 1024w`, sizes: sizes ?? "100vw" } : light ? {} : sizes ? productImageDelivery(src, sizes) : {};
  return (
    <img
      {...rest}
      src={finalSrc}
      {...delivery}
      alt={alt}
      data-light-photo={light ? "true" : undefined}
      className={`titan-themed-photo ${className ?? ""}`}
    />
  );
}
