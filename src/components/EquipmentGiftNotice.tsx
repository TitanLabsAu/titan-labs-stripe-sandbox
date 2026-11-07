import { EQUIPMENT_GIFTS_KEY, giftOfferSubtext, isGiftCatalogueSection, matchesGiftTarget, parseEquipmentGiftOffers } from "@/lib/equipment-gifts";
import { useProducts, useSiteContent } from "@/lib/useCatalog";
import type { Product } from "@/lib/products";
export function EquipmentGiftNotice({ product, variantId }: { product: Product; variantId: string | null }) {
  const { data } = useSiteContent();
  const { getProduct } = useProducts();
  const rules = parseEquipmentGiftOffers(data?.[EQUIPMENT_GIFTS_KEY]).filter(rule => rule.enabled && (
    (rule.giftSlug === product.slug && rule.giftVariantId === variantId) ||
    matchesGiftTarget(rule, { slug: product.slug, variantId, quantity: 1 }, product)
  ));
  if (!rules.length) return null;
  return <div className="mt-2 space-y-2">{rules.map(rule => {
    const gift = rule.giftSlug === product.slug ? product : getProduct(rule.giftSlug);
    const variant = gift?.variants?.find(v => v.id === rule.giftVariantId);
    if (!gift || !isGiftCatalogueSection(gift.catalogueSection) || gift.comingSoon || variant?.comingSoon ||
      (gift.variants?.length && !variant) || (!gift.variants?.length && rule.giftVariantId !== null)) return null;
    const stock = variant ? variant.stock : gift.stock;
    if (stock != null && stock < rule.giftQuantity) return null;
    const subtext = giftOfferSubtext(rule);
    const ownGift = rule.giftSlug === product.slug && rule.giftVariantId === variantId;
    return <p key={rule.id} className="text-sm font-semibold text-accent">
      {!ownGift ? <span className="block">Free: {rule.giftQuantity} × {gift.name}{variant ? ` — ${variant.label}` : ""}</span> : null}
      {rule.message || "Free item with a qualifying purchase"}
      {subtext ? <span className="mt-1 block whitespace-pre-line break-words text-xs font-normal text-muted-foreground">{subtext}</span> : null}
    </p>;
  })}</div>;
}

