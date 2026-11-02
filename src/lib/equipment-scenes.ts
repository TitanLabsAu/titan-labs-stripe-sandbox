import entries from "./equipment-scenes.json";
import {
  samePhoto,
  contentLightPhoto,
  type ProductPhotoPair,
  type VariantPhotoPair,
  type PhotoPair,
} from "./theme-image-rules";
import { optimizedProductImage } from "./product-image-delivery";
export type SceneDetail = "full" | "dial" | "logo";
export type EquipmentScene = {
  source: string;
  slugs: string[];
  cutout: string;
  width: number;
  height: number;
  previousLight?: string;
  dial?: number[];
  logo?: number[];
};
export function equipmentSceneFor(
  slug: string | undefined,
  source: string,
): EquipmentScene | undefined {
  if (!slug) return undefined;
  const normalized = optimizedProductImage(source);
  return (entries as EquipmentScene[]).find(
    (e) =>
      e.slugs.includes(slug) &&
      samePhoto(optimizedProductImage(e.source), normalized),
  );
}
/** Saved CMS art keeps precedence; generated scenes are immutable exact-source defaults. */
export function hasSceneOverride(
  slug: string | undefined,
  source: string,
  variantId: string | undefined,
  products: ProductPhotoPair[] = [],
  variants: VariantPhotoPair[] = [],
  images: PhotoPair[] = [],
  previousLight?: string,
) {
  const light = contentLightPhoto(source, images);
  return Boolean(
    (light && (!previousLight || !samePhoto(light, previousLight))) ||
    (!variantId && products.some((p) => p.slug?.trim() === slug && p.image)) ||
    variants.some(
      (p) =>
        p.slug?.trim() === slug &&
        p.variant_id?.trim() === variantId &&
        p.source &&
        p.image &&
        samePhoto(p.source, source),
    ),
  );
}
