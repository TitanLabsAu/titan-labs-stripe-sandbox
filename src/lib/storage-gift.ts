/** One complimentary container per qualifying member order. Never changes paid lines. */
export const STORAGE_SLUG = "peptide-vial-storage";
export const STORAGE_GIFT_VARIANT = "4x3ml";
export const STORAGE_GIFT_KEY = "range-storage-gift";
export const STORAGE_OFFER = "Free with any 4 × peptide purchase";
export type GiftLine = { slug: string; variantId?: string | null; quantity: number; freeGift?: boolean };
export function isStorageGift(line: GiftLine) {
  return line.freeGift === true && line.slug === STORAGE_SLUG && line.variantId === STORAGE_GIFT_VARIANT;
}
export function rangeVialCount(lines: GiftLine[], sectionFor: (slug: string) => unknown) {
  return lines.reduce((n, line) => n + (line.freeGift !== true && sectionFor(line.slug) === "range" && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99 ? line.quantity : 0), 0);
}
/** Called with the authenticated buyer and current database products on the server. */
export function validateStorageGift(lines: GiftLine[], member: boolean, sectionFor: (slug: string) => unknown) {
  const gifts = lines.filter(line => line.freeGift === true);
  if (!gifts.length) return;
  if (!member || rangeVialCount(lines, sectionFor) < 4 || gifts.length !== 1 || !isStorageGift(gifts[0]!) || gifts[0]!.quantity !== 1) {
    throw new Error("The free storage offer requires a member order with at least four Range vials and allows one 4 × 3ml container. Please review your cart.");
  }
}
