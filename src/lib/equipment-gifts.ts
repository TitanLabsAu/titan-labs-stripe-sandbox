export const EQUIPMENT_GIFTS_KEY = "equipment_free_gifts";
export type GiftTarget = { slug: string; variantId: string | null };
export type EquipmentGiftRule = {
  id: string;
  giftSlug: string;
  giftVariantId: string | null;
  enabled: boolean;
  membersOnly: boolean;
  minimumQuantity: number;
  giftQuantity: number;
  sections: ("range" | "pens" | "equipment")[];
  targets: GiftTarget[];
  message: string;
};
export type GiftProduct = {
  slug: string;
  name?: string;
  catalogueSection?: string;
  comingSoon?: boolean;
  stock?: number | null;
  variants?: { id: string; stock?: number | null; comingSoon?: boolean }[];
};
export type GiftCartLine = { slug: string; variantId?: string | null; quantity: number; freeGift?: boolean; giftOfferId?: string | null };
export const DEFAULT_STORAGE_RULE: EquipmentGiftRule = {
  id: "storage-range-four", giftSlug: "peptide-vial-storage", giftVariantId: "4x3ml",
  enabled: true, membersOnly: true, minimumQuantity: 4, giftQuantity: 1,
  sections: ["range"], targets: [], message: "Free with any 4 × peptide purchase",
};
const sections = ["range", "pens", "equipment"] as const;
const identifier = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim() || value.length > 200 || /[\u0000-\u001f]/.test(value)) throw new Error("Invalid product or offer identifier.");
  return value;
};
export function validateEquipmentGiftOffers(value: unknown): EquipmentGiftRule[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error("Save up to 100 equipment gift offers.");
  const ids = new Set<string>(), skus = new Set<string>();
  return value.map(raw => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid gift offer.");
    const id = identifier(raw.id), giftSlug = identifier(raw.giftSlug);
    const giftVariantId = raw.giftVariantId == null ? null : identifier(raw.giftVariantId);
    const sku = JSON.stringify([giftSlug, giftVariantId]);
    if (ids.has(id) || skus.has(sku)) throw new Error("Only one offer may be saved for each equipment option.");
    ids.add(id); skus.add(sku);
    if (typeof raw.enabled !== "boolean" || typeof raw.membersOnly !== "boolean") throw new Error("Choose the offer and member settings.");
    for (const n of [raw.minimumQuantity, raw.giftQuantity]) if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error("Offer quantities must be between 1 and 99.");
    if (!Array.isArray(raw.sections) || raw.sections.some((s: any) => !sections.includes(s))) throw new Error("Invalid qualifying section.");
    if (!Array.isArray(raw.targets) || raw.targets.length > 500) throw new Error("Select up to 500 qualifying products or options.");
    const targets = raw.targets.map((t: any) => ({ slug: identifier(t?.slug), variantId: t?.variantId == null ? null : identifier(t.variantId) }));
    if (raw.enabled && !raw.sections.length && !targets.length) throw new Error("Choose at least one qualifying product, option or section.");
    if (typeof raw.message !== "string" || raw.message.length > 240) throw new Error("Offer wording must be at most 240 characters.");
    return { id, giftSlug, giftVariantId, enabled: raw.enabled, membersOnly: raw.membersOnly,
      minimumQuantity: raw.minimumQuantity, giftQuantity: raw.giftQuantity,
      sections: [...new Set(raw.sections)] as EquipmentGiftRule["sections"], targets, message: raw.message.trim() };
  });
}
/** Missing settings retain the approved storage offer; malformed saved settings fail closed. */
export function parseEquipmentGiftOffers(raw: string | undefined | null): EquipmentGiftRule[] {
  if (raw == null) return structuredClone([DEFAULT_STORAGE_RULE]);
  try { return validateEquipmentGiftOffers(JSON.parse(raw)); } catch { return []; }
}
export function isFreeGift(line: GiftCartLine) { return line.freeGift === true; }
export function giftOfferId(line: GiftCartLine): string {
  // Old carts/payment forms may still send the original storage marker.
  return line.giftOfferId || (line.freeGift === true && line.slug === DEFAULT_STORAGE_RULE.giftSlug && line.variantId === DEFAULT_STORAGE_RULE.giftVariantId ? DEFAULT_STORAGE_RULE.id : "");
}
export function matchesGiftTarget(rule: EquipmentGiftRule, line: GiftCartLine, product?: GiftProduct): boolean {
  return !isFreeGift(line) && Boolean(product && (
    rule.sections.includes(product.catalogueSection as any) || rule.targets.some(t => t.slug === line.slug && (t.variantId === null || t.variantId === (line.variantId ?? null)))
  ));
}
export function qualifyingGiftQuantity(rule: EquipmentGiftRule, lines: GiftCartLine[], lookup: (slug: string) => GiftProduct | undefined) {
  return lines.reduce((n, line) => n + (matchesGiftTarget(rule, line, lookup(line.slug)) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99 ? line.quantity : 0), 0);
}
export function eligibleGiftRules(rules: EquipmentGiftRule[], lines: GiftCartLine[], member: boolean, lookup: (slug: string) => GiftProduct | undefined) {
  return rules.filter(rule => {
    if (!rule.enabled || (rule.membersOnly && !member) || qualifyingGiftQuantity(rule, lines, lookup) < rule.minimumQuantity) return false;
    const product = lookup(rule.giftSlug);
    if (!product || product.catalogueSection !== "equipment" || product.comingSoon) return false;
    const variant = product.variants?.find(v => v.id === rule.giftVariantId);
    if ((product.variants?.length && !variant) || (!product.variants?.length && rule.giftVariantId !== null) || variant?.comingSoon) return false;
    const stock = variant ? variant.stock : product.stock;
    const paid = lines.filter(l => !isFreeGift(l) && l.slug === rule.giftSlug && (l.variantId ?? null) === rule.giftVariantId).reduce((n, l) => n + l.quantity, 0);
    return stock == null || stock >= paid + rule.giftQuantity;
  });
}
export function validateGiftLines(rules: EquipmentGiftRule[], lines: GiftCartLine[], member: boolean, lookup: (slug: string) => GiftProduct | undefined) {
  const eligible = new Map(eligibleGiftRules(rules, lines, member, lookup).map(rule => [rule.id, rule]));
  const seen = new Set<string>();
  for (const line of lines.filter(isFreeGift)) {
    const id = giftOfferId(line), rule = eligible.get(id);
    if (!rule || seen.has(id) || line.slug !== rule.giftSlug || (line.variantId ?? null) !== rule.giftVariantId || line.quantity !== rule.giftQuantity) {
      throw new Error("A free equipment offer has changed, no longer qualifies or is out of stock. Please refresh and review your cart.");
    }
    seen.add(id);
  }
}
/** Validate Admin selections against the saved catalogue, never browser-provided names/prices. */
export function validateGiftCatalogue(rules: EquipmentGiftRule[], lookup: (slug: string) => GiftProduct | undefined) {
  for (const rule of rules) {
    if (!rule.enabled) continue; // Retired/deleted choices can always be switched off.
    const gift = lookup(rule.giftSlug);
    if (!gift || gift.catalogueSection !== "equipment") throw new Error("Free gifts must be saved Equipment products.");
    if (gift.variants?.length ? !gift.variants.some(v => v.id === rule.giftVariantId) : rule.giftVariantId !== null) throw new Error("Choose a saved equipment option, then save the offer.");
    for (const t of rule.targets) {
      const product = lookup(t.slug);
      if (!product || (t.variantId !== null && !product.variants?.some(v => v.id === t.variantId))) throw new Error("A qualifying product or option no longer exists. Update the selection.");
    }
  }
}
