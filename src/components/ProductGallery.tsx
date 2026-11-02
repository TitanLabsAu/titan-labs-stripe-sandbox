import { RangeProductArt } from "./RangeProductArt";
import { useState } from "react";
import type { Product, ProductVariant } from "@/lib/products";
import {
  productHighlights,
  isPenGallery,
  type GalleryEntry,
  type HighlightPhoto,
} from "@/lib/product-gallery";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import {
  ThemedArt,
  ThemedContentImage,
  ThemedProductImage,
} from "./ThemedImage";
import { ProductChristmasDecor } from "./christmas/ChristmasTheme";
function HighlightImage({
  photo,
  product,
  variant,
  thumbnail = false,
}: {
  photo: HighlightPhoto;
  product: Product;
  variant: ProductVariant | undefined;
  thumbnail?: boolean;
}) {
  if (photo.rangeView)
    return (
      <RangeProductArt
        product={product}
        variant={variant}
        view={photo.rangeView}
        className="absolute inset-0 h-full w-full"
        alt={thumbnail ? "" : undefined}
        thumbnail={thumbnail}
      />
    );
  const props = {
    alt: thumbnail
      ? ""
      : `${product.name}${variant ? ` — ${variant.label}` : ""}: ${photo.label}`,
    className: `absolute max-w-none ${isPenGallery(product) ? "object-cover" : "object-contain"}`,
    style: {
      width: `${photo.scale * 100}%`,
      height: `${photo.scale * 100}%`,
      left: `${Math.min(0, Math.max(100 - photo.scale * 100, 50 - photo.x * photo.scale * 100))}%`,
      top: `${Math.min(0, Math.max(100 - photo.scale * 100, 50 - photo.y * photo.scale * 100))}%`,
    },
    decoding: "async" as const,
  };
  if (photo.light)
    return (
      <ThemedArt
        dark={photo.src}
        light={photo.light}
        sizes={thumbnail ? "180px" : "(min-width:1024px) 50vw, 100vw"}
        {...props}
      />
    );
  return photo.custom ? (
    <ThemedContentImage src={photo.src} {...props} />
  ) : (
    <ThemedProductImage
      slug={product.slug}
      src={photo.src}
      variantId={variant?.image ? variant.id : undefined}
      sizes={thumbnail ? "180px" : "(min-width:1024px) 50vw, 100vw"}
      {...props}
    />
  );
}
export function ProductGallery({
  product,
  variant,
}: {
  product: Product;
  variant: ProductVariant | undefined;
}) {
  const { data } = useSiteContent();
  const entries = cmsValues(data, "product_galleries").items as GalleryEntry[];
  const photos = productHighlights(product, variant, entries);
  const [index, setIndex] = useState(0);
  const activeIndex = Math.min(index, photos.length - 1);
  const photo = photos[activeIndex]!;
  return (
    <figure
      className="min-w-0 self-start"
      aria-label={`${product.name} photo gallery`}
    >
      <div
        className={`titan-product-gallery-photo relative isolate ${isPenGallery(product) ? "aspect-[4/3]" : "aspect-square"} rounded-xl border border-primary/25 bg-card`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <HighlightImage photo={photo} product={product} variant={variant} />
        </div>
        <ProductChristmasDecor />
      </div>
      {photos.length > 1 ? (
        <>
          <figcaption
            className={
              photo.rangeView ? "sr-only" : "mt-2 text-xs text-muted-foreground"
            }
            aria-live="polite"
          >
            {photo.label}
          </figcaption>
          <div
            className="mt-3 grid grid-cols-3 gap-3"
            aria-label="Product highlight photos"
          >
            {photos.map((p, i) => (
              <div key={i} className="min-w-0">
                <button
                  type="button"
                  aria-label={`Show ${p.label.toLowerCase()}`}
                  aria-pressed={activeIndex === i}
                  onClick={() => setIndex(i)}
                  className={`relative w-full aspect-[4/3] overflow-hidden rounded-lg border-2 bg-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeIndex === i ? "border-primary" : "border-border hover:border-primary/60"}`}
                >
                  <HighlightImage
                    photo={p}
                    product={product}
                    variant={variant}
                    thumbnail
                  />
                  {!p.rangeView ? (
                    <span className="absolute inset-x-0 bottom-0 bg-card/95 py-1 text-[10px] text-foreground">
                      {p.label}
                    </span>
                  ) : null}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </figure>
  );
}
