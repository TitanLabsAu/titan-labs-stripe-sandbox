import shippedPairs from "./product-theme-pairs.json";
import optimizedImages from "./optimized-product-images.json";

const optimized = optimizedImages as Record<string, string>;
const optimizedSources = new Set(Object.values(optimized));
const pairedPhotos = new Set(
  shippedPairs
    .flatMap((p) => [p.dark, p.light])
    .filter((p) => p.startsWith("/images/product-theme/")),
);

/** Only known original catalogue files use optimised copies. New Admin uploads keep their own URL. */
export function optimizedProductImage(value: string): string {
  try {
    const url = new URL(value, "https://titanlabsaus.com");
    if (
      url.origin !== "https://titanlabsaus.com" ||
      url.pathname !== "/api/public/product-image"
    )
      return value;
    return optimized[url.searchParams.get("path") ?? ""] ?? value;
  } catch {
    return value;
  }
}

export function productImageDelivery(value: string, sizes: string) {
  const src = optimizedProductImage(value);
  if (src.startsWith("/images/catalogue-polish-v2/")) return { srcSet: `${src.replace(/\.webp$/, "-480.webp")} 480w, ${src} 1254w`, sizes };
  if (pairedPhotos.has(src))
    return {
      srcSet: `${src.replace(/\.webp$/, "-480.webp")} 480w, ${src} 1024w`,
      sizes,
    };
  if (!optimizedSources.has(src)) return {};
  const stem = src.slice(0, -5);
  return {
    srcSet: `${stem}-480.webp 480w, ${stem}-960.webp 960w, ${src} 1024w`,
    sizes,
  };
}

