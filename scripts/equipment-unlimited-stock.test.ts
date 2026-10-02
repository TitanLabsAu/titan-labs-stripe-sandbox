import { describe, expect, test } from "bun:test";
import {
  effectivePack,
  effectiveStock,
  getProductOption,
  isUnlimitedStock,
  stockState,
  totalStockFor,
  variantStockFor,
  type Product,
} from "../src/lib/products";
import { equipmentUpsellState } from "../src/lib/cart-upsell";
import { canAddStarterKit } from "../src/lib/starter-kits";
import { priceCheckout } from "../src/lib/checkout-pricing.server";

const base = { image: "", alt: "", blurb: "", details: [] };
const bacUnlimited: Product = {
  ...base, slug: "bac-water", name: "BAC Water", price: 5, catalogueSection: "equipment", unlimitedStock: true, stock: 0,
  variants: [{ id: "3ml", label: "3ml", price: 5, stock: 0 }, { id: "10ml", label: "10ml", price: 15, stock: 0 }],
};
const bacTracked: Product = { ...bacUnlimited, unlimitedStock: false };

/** Minimal admin stub for priceCheckout: products + settings reads only. */
function fakeAdmin(rows: any[]) {
  const writes: string[] = [];
  const chain = (result: any) => {
    const c: any = {
      select: () => c, in: () => c, eq: () => c,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (r: any) => Promise.resolve(result).then(r),
      update: () => { writes.push("update"); return c; },
      insert: () => { writes.push("insert"); return c; },
    };
    return c;
  };
  return {
    writes,
    from: (t: string) => chain(t === "products" ? { data: rows, error: null } : { data: null, error: null }),
    rpc: async () => ({ data: 0, error: null }),
  };
}
const row = (over: any) => ({
  slug: "bac-water", name: "BAC Water", price: 5, sale_price: null, kit_price: null,
  catalogue_section: "equipment", stock_quantity: 0, coming_soon: false, unlimited_stock: false,
  product_variants: [{ id: "3ml", label: "3ml", price: 5, stock: 0 }], ...over,
});
const buyer = { userId: null, emails: [], emailVerified: false };
const order = (quantity: number, pack: "single" | "kit" = "single") => ({
  items: [{ slug: "bac-water", variantId: "3ml", pack, quantity }],
  shippingMethod: "standard" as const, paymentMethod: "card" as const,
});

describe("shared unlimited-stock rule", () => {
  test("only Equipment can be unlimited", () => {
    expect(isUnlimitedStock(bacUnlimited)).toBe(true);
    expect(isUnlimitedStock({ catalogue_section: "range", unlimited_stock: true })).toBe(false);
    expect(isUnlimitedStock({ catalogue_section: "pens", unlimited_stock: true })).toBe(false);
    expect(isUnlimitedStock({ catalogue_section: "equipment", unlimited_stock: false })).toBe(false);
    expect(effectiveStock({ catalogue_section: "range", unlimited_stock: true }, 0)).toBe(0);
  });
  test("unlimited stock 0 is buyable; tracked stock 0 is blocked", () => {
    expect(stockState(variantStockFor(bacUnlimited, "3ml"))).toBe("ok");
    expect(totalStockFor(bacUnlimited)).toBeNull();
    expect(getProductOption(bacUnlimited, "3ml").stock).toBeNull();
    expect(stockState(variantStockFor(bacTracked, "3ml"))).toBe("out");
    expect(equipmentUpsellState(bacUnlimited, "3ml", []).canAdd).toBe(true);
    expect(equipmentUpsellState(bacTracked, "3ml", []).canAdd).toBe(false);
  });
  test("cart quantity stays bounded at 99", () => {
    const items = [{ key: "k", slug: "bac-water", variantId: "3ml", pack: "single" as const, quantity: 99 }];
    expect(equipmentUpsellState(bacUnlimited, "3ml", items).canAdd).toBe(false);
  });
  test("unlimited starter kit can be added with stock 0", () => {
    const kit: Product = { ...base, slug: "range-starter-kit", name: "Kit", price: 30, catalogueSection: "equipment", unlimitedStock: true, stock: null };
    expect(canAddStarterKit(kit, [])).toBe(true);
    expect(canAddStarterKit({ ...kit, unlimitedStock: false, stock: 0 }, [])).toBe(false);
  });
  test("Equipment stays single-only even when unlimited", () => {
    expect(effectivePack(bacUnlimited, "kit")).toBe("single");
    expect(getProductOption(bacUnlimited, "3ml", "kit").pack).toBe("single");
  });
});

describe("server pricing (authoritative DB flag)", () => {
  test("tracked Equipment with 0 stock is rejected", async () => {
    await expect(priceCheckout(fakeAdmin([row({})]), buyer, order(1))).rejects.toThrow(/not enough stock/);
  });
  test("unlimited Equipment with 0 stock prices real quantity and revenue, no writes", async () => {
    const admin = fakeAdmin([row({ unlimited_stock: true })]);
    const p = await priceCheckout(admin, buyer, order(12));
    expect(p.lines).toEqual([{ product_slug: "bac-water", product_name: "BAC Water", unit_price: 5, quantity: 12, variant_label: "3ml" }]);
    expect(p.quote.itemsCents).toBe(6000);
    expect(admin.writes).toEqual([]);
  });
  test("unlimited quantity still bounded 1..99", async () => {
    const admin = fakeAdmin([row({ unlimited_stock: true })]);
    await expect(priceCheckout(admin, buyer, order(100))).rejects.toThrow(/Invalid item quantity/);
    await expect(priceCheckout(admin, buyer, order(1.5))).rejects.toThrow(/Invalid item quantity/);
  });
  test("Range/Pens cannot bypass stock even if the flag were set", async () => {
    for (const section of ["range", "pens"]) {
      const admin = fakeAdmin([row({ catalogue_section: section, unlimited_stock: true })]);
      await expect(priceCheckout(admin, buyer, order(1))).rejects.toThrow(/not enough stock/);
    }
  });
  test("posted unlimited flag is ignored", async () => {
    const items = [{ slug: "bac-water", variantId: "3ml", quantity: 1, unlimitedStock: true } as any];
    await expect(
      priceCheckout(fakeAdmin([row({})]), buyer, { ...order(1), items }),
    ).rejects.toThrow(/not enough stock/);
  });
  test("tampered kit on unlimited Equipment is charged as single", async () => {
    const p = await priceCheckout(fakeAdmin([row({ unlimited_stock: true })]), buyer, order(2, "kit"));
    expect(p.lines[0].unit_price).toBe(5);
    expect(p.lines[0].variant_label).toBe("3ml");
  });
});
