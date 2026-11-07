import assert from "node:assert/strict";
import { rangeVialCount, validateStorageGift, isStorageGift, STORAGE_SLUG } from "../src/lib/storage-gift.ts";
const section = (slug: string) => slug.startsWith("vial-") ? "range" : "equipment";
const gift = { slug: STORAGE_SLUG, variantId: "4x3ml", quantity: 1, freeGift: true };
const mixed = [{ slug: "vial-a", quantity: 2 }, { slug: "vial-b", quantity: 2 }];
assert.equal(rangeVialCount(mixed, section), 4);
assert.equal(rangeVialCount([{ slug: "pen", quantity: 4 }, { slug: "case", quantity: 4 }], section), 0);
assert.equal(rangeVialCount([{ slug: "unknown", quantity: 4 }], section), 0);
assert.equal(rangeVialCount([{ slug: "vial-a", quantity: NaN }], section), 0);
assert.equal(isStorageGift(gift), true);
assert.equal(isStorageGift({ ...gift, freeGift: false }), false);
validateStorageGift([...mixed, gift], true, section);
validateStorageGift([{ slug: "vial-a", quantity: 8 }, gift], true, section);
validateStorageGift(mixed, true, section); // Customer declines.
validateStorageGift([{ slug: STORAGE_SLUG, variantId: "4x3ml", quantity: 2 }], false, section); // Ordinary paid purchase.
for (const [items, member] of [
  [[...mixed, gift], false],
  [[{ slug: "vial-a", quantity: 3 }, gift], true],
  [[...mixed, gift, gift], true],
  [[...mixed, { ...gift, quantity: 2 }], true],
  [[...mixed, { ...gift, variantId: "2x3ml" }], true],
  [[...mixed, { ...gift, slug: "other" }], true],
] as const) assert.throws(() => validateStorageGift([...items], member, section));
console.log("Storage gift eligibility, mixed vials, guests, opt-out and tamper checks passed.");
