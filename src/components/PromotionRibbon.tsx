import type { CSSProperties } from "react";
import type { BannerOption } from "@/lib/promotion-banners";

/** Validated user colours become local semantic tokens, never arbitrary CSS. */
export function PromotionRibbon({ banner, preview = false }: { banner: BannerOption; preview?: boolean }) {
  return <span className={`titan-promo-badge titan-promo-ribbon titan-promo-ribbon--configured${preview ? " titan-promo-ribbon--preview" : ""}`}
    style={{ "--promotion-background": banner.background, "--promotion-text": banner.text } as CSSProperties}>{banner.label}</span>;
}