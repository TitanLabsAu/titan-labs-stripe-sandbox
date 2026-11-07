import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_STORAGE_RULE, eligibleGiftRules, matchesGiftTarget, parseEquipmentGiftOffers, validateEquipmentGiftOffers, validateGiftCatalogue, validateGiftLines, type EquipmentGiftRule, type GiftProduct } from "../src/lib/equipment-gifts.ts";
const products: GiftProduct[] = [
  { slug: "vial-a", catalogueSection: "range", stock: 20, variants: [{ id: "10mg", stock: 20 }, { id: "20mg", stock: 20 }] },
  { slug: "vial-b", catalogueSection: "range", stock: 20 },
  { slug: "pen", catalogueSection: "pens", stock: 20, variants: [{ id: "blue", stock: 20 }, { id: "purple", stock: 20 }] },
  { slug: "case", catalogueSection: "equipment", stock: 10 },
  { slug: "wipe", catalogueSection: "equipment", stock: 20 },
  { slug: "peptide-vial-storage", catalogueSection: "equipment", stock: 40, variants: [{ id: "2x3ml", stock: 20 }, { id: "4x3ml", stock: 20 }] },
];
const lookup = (slug: string) => products.find(p => p.slug === slug);
const rule: EquipmentGiftRule = { id: "free-wipes", giftSlug: "wipe", giftVariantId: null, enabled: true, membersOnly: false, minimumQuantity: 2, giftQuantity: 3, sections: [], targets: [{ slug: "pen", variantId: "blue" }, { slug: "case", variantId: null }], message: "Free wipes" };
const paid = [{ slug: "pen", variantId: "blue", quantity: 1 }, { slug: "case", quantity: 1 }];
const gift = { slug: "wipe", quantity: 3, freeGift: true, giftOfferId: "free-wipes" };
test("existing storage offer is preserved as editable defaults; empty disables it", () => {
  assert.deepEqual(parseEquipmentGiftOffers(undefined), [DEFAULT_STORAGE_RULE]);
  assert.deepEqual(parseEquipmentGiftOffers("[]"), []);
  assert.deepEqual(parseEquipmentGiftOffers("broken"), []);
});
test("specific options and mixed catalogue products combine without double counting", () => {
  assert.equal(eligibleGiftRules([rule], paid, false, lookup).length, 1);
  assert.equal(eligibleGiftRules([rule], [{ slug: "pen", variantId: "purple", quantity: 2 }], false, lookup).length, 0);
  assert.equal(eligibleGiftRules([{ ...rule, sections: ["pens"], targets: [{ slug: "pen", variantId: "blue" }] }], [{ slug: "pen", variantId: "blue", quantity: 1 }], false, lookup).length, 0);
});
test("entire sections and all product options can qualify", () => {
  assert.equal(eligibleGiftRules([{ ...rule, sections: ["pens"] }], [{ slug: "pen", variantId: "purple", quantity: 2 }], false, lookup).length, 1);
  assert.equal(eligibleGiftRules([{ ...rule, targets: [{ slug: "pen", variantId: null }] }], [{ slug: "pen", variantId: "purple", quantity: 2 }], false, lookup).length, 1);
});
test("members-only settings and disabled rules are enforced", () => {
  assert.equal(eligibleGiftRules([{ ...rule, membersOnly: true }], paid, false, lookup).length, 0);
  assert.equal(eligibleGiftRules([{ ...rule, membersOnly: true }], paid, true, lookup).length, 1);
  assert.equal(eligibleGiftRules([{ ...rule, enabled: false }], paid, true, lookup).length, 0);
});
test("gifts cannot qualify for this or another gift; paid self-pairing is valid", () => {
  const self = { ...rule, minimumQuantity: 1, targets: [{ slug: "wipe", variantId: null }] };
  assert.equal(eligibleGiftRules([self], [gift], true, lookup).length, 0);
  assert.equal(eligibleGiftRules([self], [{ slug: "wipe", quantity: 1 }], true, lookup).length, 1);
  assert.equal(matchesGiftTarget(self, gift, lookup("wipe")), false);
});
test("paid plus free quantities share stock; out of stock/coming soon fail closed", () => {
  assert.equal(eligibleGiftRules([rule], [...paid, { slug: "wipe", quantity: 18 }], true, lookup).length, 0);
  const unavailable = (slug: string) => slug === "wipe" ? { ...lookup(slug)!, stock: 0 } : lookup(slug);
  assert.equal(eligibleGiftRules([rule], paid, true, unavailable).length, 0);
  const soon = (slug: string) => slug === "wipe" ? { ...lookup(slug)!, comingSoon: true } : lookup(slug);
  assert.equal(eligibleGiftRules([rule], paid, true, soon).length, 0);
});
test("server permits exact configured gift and customer opt-out", () => {
  validateGiftLines([rule], [...paid, gift], false, lookup);
  validateGiftLines([rule], paid, false, lookup);
});
test("server rejects forged IDs, SKUs, quantities, duplicates and stale offers", () => {
  for (const gifts of [[{ ...gift, giftOfferId: "forged" }], [{ ...gift, slug: "case" }], [{ ...gift, quantity: 4 }], [gift, gift]]) {
    assert.throws(() => validateGiftLines([rule], [...paid, ...gifts], true, lookup));
  }
  assert.throws(() => validateGiftLines([], [...paid, gift], true, lookup));
  assert.throws(() => validateGiftLines([{ ...rule, enabled: false }], [...paid, gift], true, lookup));
});
test("multiple equipment offers can qualify independently", () => {
  const caseRule = { ...rule, id: "free-case", giftSlug: "case", giftQuantity: 1 };
  const lines = [...paid, gift, { slug: "case", quantity: 1, freeGift: true, giftOfferId: "free-case" }];
  validateGiftLines([rule, caseRule], lines, false, lookup);
  assert.equal(eligibleGiftRules([rule, caseRule], lines, false, lookup).length, 2);
});
test("legacy storage markers still validate only against the current saved rule", () => {
  const lines = [{ slug: "vial-a", variantId: "10mg", quantity: 2 }, { slug: "vial-b", quantity: 2 }, { slug: "peptide-vial-storage", variantId: "4x3ml", quantity: 1, freeGift: true }];
  validateGiftLines([DEFAULT_STORAGE_RULE], lines, true, lookup);
  assert.throws(() => validateGiftLines([], lines, true, lookup));
});
test("Admin rejects invalid settings, duplicate gift options and unsaved catalogue references", () => {
  validateGiftCatalogue(validateEquipmentGiftOffers([rule]), lookup);
  for (const bad of [{ ...rule, minimumQuantity: 0 }, { ...rule, giftQuantity: 100 }, { ...rule, sections: ["made-up"] }, { ...rule, sections: [], targets: [] }]) assert.throws(() => validateEquipmentGiftOffers([bad]));
  assert.throws(() => validateEquipmentGiftOffers([rule, { ...rule, id: "another" }]));
  assert.throws(() => validateGiftCatalogue([{ ...rule, giftSlug: "pen" }], lookup));
  assert.throws(() => validateGiftCatalogue([{ ...rule, targets: [{ slug: "pen", variantId: "missing" }] }], lookup));
  validateGiftCatalogue([{ ...rule, enabled: false, targets: [{ slug: "deleted", variantId: null }] }], lookup);
});
