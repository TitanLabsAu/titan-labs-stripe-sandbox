import { describe, expect, test } from "bun:test";
import { allowsKit, effectivePack, getProductOption, singleLabelFor, type Product } from "../src/lib/products";
import { coerceCartItems, type CartItem } from "../src/lib/cart";

const base = { image: "", alt: "", blurb: "", details: [] };
const bac: Product = {
  ...base, slug: "bac-water", name: "BAC Water", price: 5, catalogueSection: "equipment", kitPrice: 99,
  variants: [{ id: "3ml", label: "3ml", price: 5, kitPrice: 40 }, { id: "10ml", label: "10ml", price: 15 }],
};
const range: Product = { ...base, slug: "klow", name: "KLOW", price: 100, catalogueSection: "range" };

describe("equipment is single-item only", () => {
  test("rule", () => {
    expect(allowsKit(bac)).toBe(false);
    expect(allowsKit({ catalogue_section: "equipment" })).toBe(false);
    expect(effectivePack(bac, "kit")).toBe("single");
    expect(singleLabelFor(bac)).toBe("Single item");
  });
  test("tampered kit request prices as single", () => {
    const o = getProductOption(bac, "3ml", "kit");
    expect(o.pack).toBe("single");
    expect(o.unitPrice).toBe(5);
    expect(o.label).toBe("3ml");
    expect(getProductOption(bac, "10ml", "kit").unitPrice).toBe(15);
  });
  test("stale cart kit lines become single and merge", () => {
    const items: CartItem[] = [
      { key: "bac-water::3ml::kit", slug: "bac-water", quantity: 2, variantId: "3ml", pack: "kit" },
      { key: "bac-water::3ml::single", slug: "bac-water", quantity: 1, variantId: "3ml", pack: "single" },
    ];
    const out = coerceCartItems(items, (s) => (s === "bac-water" ? bac : null));
    expect(out).toEqual([{ key: "bac-water::3ml::single", slug: "bac-water", quantity: 3, variantId: "3ml", pack: "single" }]);
  });
});

describe("range kits unchanged", () => {
  test("kit still allowed at 20% off", () => {
    expect(allowsKit(range)).toBe(true);
    const o = getProductOption(range, null, "kit");
    expect(o.pack).toBe("kit");
    expect(o.unitPrice).toBe(800);
    expect(o.label).toBe("Single vial · 10x Kit");
    const items: CartItem[] = [{ key: "klow::base::kit", slug: "klow", quantity: 1, pack: "kit" }];
    expect(coerceCartItems(items, () => range)).toBe(items);
  });
});
