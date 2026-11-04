import {
  productLightPhoto,
  usesNeutralEquipmentTone,
  productDarkPhoto,
  shippedPhotoPair,
  contentLightPhoto,
  type ProductPhotoPair,
  type VariantPhotoPair,
  type PhotoPair,
} from "@/lib/theme-image-rules";
import type { ImgHTMLAttributes } from "react";
import { LIGHT_PRODUCT_IMAGES } from "@/lib/light-product-images";
import { productImageDelivery } from "@/lib/product-image-delivery";
import { canonicalUrl, cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { artDelivery } from "@/lib/theme-art";

export const LIGHT_DISCOVERY_ART = "/images/titan-discovery-light.webp";
const responsiveLightPhotos = new Set(Object.values(LIGHT_PRODUCT_IMAGES));

/** Resolved dark/light pair; the dark image is always the untouched original. */
export function themedArtPair(
  dark: string,
  light: string | undefined | null,
  fallback = LIGHT_DISCOVERY_ART,
) {
  const builtins = [
    "/images/titan-discovery.webp",
    "/images/titan-catalogue-banner.webp",
    "/images/titan-membership-card.webp",
    "/images/titan-testing-laboratory-1254-v2.webp",
  ];
  return {
    dark,
    light:
      (light && canonicalUrl(light)) ||
      (builtins.includes(dark) ? fallback : dark),
  };
}

export function useLightProductPhoto(
  slug: string | undefined,
  src: string,
  variantId?: string,
) {
  const { data } = useSiteContent();
  const values = cmsValues(data, "theme_artwork");
  return productLightPhoto(
    slug,
    src,
    variantId,
    values.products as ProductPhotoPair[],
    values.variants as VariantPhotoPair[],
    values.images as PhotoPair[],
  );
}

type ArtProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet"
> & {
  dark: string;
  light: string;
  sizes: string;
  alt: string;
  /** Above-the-fold hero: high fetch priority for whichever variant the CSS shows. */
  priority?: boolean;
  /** Decorative tint is disabled for physical product gallery photographs. */
  tone?: boolean;
};

/**
 * Renders both variants; CSS on <html class="light|dark"> shows exactly one from first paint.
 * Both are loading="lazy", so the hidden (display:none) variant is never fetched until shown or preloaded.
 */
export function ThemedArt({
  dark,
  light,
  sizes,
  alt,
  priority,
  loading = "lazy",
  tone = true,
  className,
  ...rest
}: ArtProps) {
  const { data } = useSiteContent();
  light =
    contentLightPhoto(
      dark,
      cmsValues(data, "theme_artwork").images as PhotoPair[],
    ) || light;
  const pr = priority ? { fetchPriority: "high" as const } : {};
  return (
    <>
      <img
        {...rest}
        {...pr}
        src={dark}
        {...artDelivery(dark, sizes)}
        alt={alt}
        loading={loading ?? "lazy"}
        decoding="async"
        data-theme-variant="dark"
        className={`theme-variant-dark ${tone ? "titan-navy-gold-art" : ""} ${className ?? ""}`}
      />
      <img
        {...rest}
        {...pr}
        src={light}
        {...artDelivery(light, sizes)}
        alt={alt}
        loading={loading ?? "lazy"}
        decoding="async"
        data-theme-variant="light"
        className={`theme-variant-light ${tone ? "titan-navy-gold-art" : ""} ${className ?? ""}`}
      />
    </>
  );
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  slug: string | undefined;
  variantId?: string | undefined;
  sceneDetail?: "full" | "dial" | "logo" | undefined;
  src: string;
  alt: string;
  sizes?: string;
};

export function ThemedProductImage({
  slug,
  variantId,
  src,
  sizes,
  alt,
  className,
  loading,
  sceneDetail: _sceneDetail,
  ...rest
}: Props) {
  const light = useLightProductPhoto(slug, src, variantId);
  const dark = productDarkPhoto(slug, src);
  const darkDelivery = productImageDelivery(dark, sizes || "100vw");
  const cls = `titan-themed-photo ${usesNeutralEquipmentTone(slug, src) ? "titan-navy-gold-neutral" : ""} ${className ?? ""}`;
  if (!light) {
    return (
      <img
        {...rest}
        loading={loading}
        src={src}
        {...darkDelivery}
        alt={alt}
        className={cls}
      />
    );
  }
  // Only shipped photo pairs have a guaranteed 480px counterpart; arbitrary CMS uploads do not.
  const lightDelivery = responsiveLightPhotos.has(light)
    ? {
        srcSet: `${light.replace(/\.webp$/, "-480.webp")} 480w, ${light} 1024w`,
        sizes: sizes ?? "100vw",
      }
    : productImageDelivery(light, sizes || "100vw");
  return (
    <>
      <img
        {...rest}
        loading={loading ?? "lazy"}
        src={dark}
        {...darkDelivery}
        alt={alt}
        data-theme-variant="dark"
        className={`theme-variant-dark ${cls}`}
      />
      <img
        {...rest}
        loading={loading ?? "lazy"}
        src={light}
        {...lightDelivery}
        alt={alt}
        data-theme-variant="light"
        data-light-photo="true"
        className={`theme-variant-light ${cls}`}
      />
    </>
  );
}

/** Exact source-bound pairs also cover uploaded page, guide and branding photos. */
export function ThemedContentImage({
  src,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string }) {
  const { data } = useSiteContent();
  const shipped = shippedPhotoPair(src);
  const dark = shipped?.dark || src;
  const light =
    contentLightPhoto(
      src,
      cmsValues(data, "theme_artwork").images as PhotoPair[],
    ) || shipped?.light;
  if (!light) return <img {...props} src={src} />;
  return (
    <>
      <img
        {...props}
        src={dark}
        {...productImageDelivery(dark, props.sizes || "100vw")}
        data-theme-variant="dark"
        className={`theme-variant-dark ${props.className ?? ""}`}
      />
      <img
        {...props}
        src={light}
        data-theme-variant="light"
        srcSet={undefined}
        {...productImageDelivery(light, props.sizes || "100vw")}
        {...artDelivery(light, props.sizes || "100vw")}
        className={`theme-variant-light ${props.className ?? ""}`}
      />
    </>
  );
}



