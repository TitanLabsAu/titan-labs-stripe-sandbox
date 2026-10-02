import { describe, expect, test } from "bun:test";
import { allowsKit, effectivePack, getProductOption, singleLabelFor, type Product } from "../src/lib/products";
import { coerceCartItems, type CartItem } from "../src/lib/cart";
import { cartVariantQuantity, equipmentUpsellState } from "../src/lib/cart-upsell";
import { resolveCatalogueSection } from "../src/lib/catalogue-sections";

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

describe("cart Equipment upsell", () => {
  test("uses the exact live BAC Water variants as single items", () => {
    const three = equipmentUpsellState(bac, "3ml", [],);
    const ten = equipmentUpsellState(bac, "10ml", []);
    expect(three.option.variantId).toBe("3ml");
    expect(three.option.pack).toBe("single");
    expect(three.option.unitPrice).toBe(5);
    expect(ten.option.variantId).toBe("10ml");
    expect(ten.option.pack).toBe("single");
    expect(ten.option.unitPrice).toBe(15);
  });

  test("tracks single quantity and enforces variant stock boundaries", () => {
    const stocked: Product = {
      ...bac,
      variants: [
        { id: "3ml", label: "3ml", price: 5, stock: 2 },
        { id: "10ml", label: "10ml", price: 15, stock: 0 },
      ],
    };
    const one: CartItem[] = [
      { key: "bac-water::3ml::single", slug: "bac-water", variantId: "3ml", pack: "single", quantity: 1 },
    ];
    const two: CartItem[] = [{ ...one[0], quantity: 2 }];
    expect(cartVariantQuantity(one, "bac-water", "3ml")).toBe(1);
    expect(equipmentUpsellState(stocked, "3ml", one).canAdd).toBe(true);
    expect(equipmentUpsellState(stocked, "3ml", two).canAdd).toBe(false);
    expect(equipmentUpsellState(stocked, "10ml", []).canAdd).toBe(false);
  });

  test("coming-soon variants cannot be added", () => {
    const soon: Product = {
      ...bac,
      variants: [{ id: "3ml", label: "3ml", price: 5, stock: 5, comingSoon: true }],
    };
    expect(equipmentUpsellState(soon, "3ml", []).canAdd).toBe(false);
  });
});

describe("Equipment catalogue navigation", () => {
  test("uses requested populated section and falls back in fixed available order", () => {
    expect(resolveCatalogueSection("equipment", ["range", "equipment"])).toBe("equipment");
    expect(resolveCatalogueSection("pens", ["range", "equipment"])).toBe("range");
    expect(resolveCatalogueSection("invalid", ["equipment"])).toBe("equipment");
  });
});
