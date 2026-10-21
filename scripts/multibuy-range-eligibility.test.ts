import { describe, expect, test } from "bun:test";
import { quoteOrder, DEFAULT_PRICING_SETTINGS, type PriceLine } from "../src/lib/order-pricing";
import { cartPriceLines } from "../src/lib/useReferralSettings";
import { priceCheckout } from "../src/lib/checkout-pricing.server";
import type { Product } from "../src/lib/products";

const S = DEFAULT_PRICING_SETTINGS; // tiers: 2→10%, 3→15%, 4→20%; crypto 10%; cap 20%

const line = (unitCents: number, quantity: number, multibuyEligible?: boolean): PriceLine => ({
  unitCents,
  baseCents: unitCents,
  quantity,
  multibuyEligible,
});

const quote = (lines: PriceLine[], paymentMethod = "payid") =>
  quoteOrder({ lines, shippingMethod: "express", paymentMethod }, S);

describe("Titan Stack counts Range products only", () => {
  test("1 Range + BAC Water (equipment) = no stack multibuy", () => {
    const q = quote([line(10000, 1, true), line(1500, 1, false)]);
    expect(q.multibuyUnits).toBe(1);
    expect(q.multibuyPercent).toBe(0);
    expect(q.multibuyCents).toBe(0);
  });

  test("2 eligible Range + BAC Water = 2-item rate on the Range subtotal only", () => {
    // 2 × $100 Range + 1 × $15 BAC Water → 10% of $200 = $20, not 10% of $215.
    const q = quote([line(10000, 2, true), line(1500, 1, false)]);
    expect(q.multibuyUnits).toBe(2);
    expect(q.multibuyPercent).toBe(10);
    expect(q.multibuyCents).toBe(2000);
    expect(q.itemsCents).toBe(21500);
  });

  test("3 Range items reach the 15% tier, 4 reach 20%", () => {
    expect(quote([line(10000, 3, true)]).multibuyPercent).toBe(15);
    expect(quote([line(10000, 3, true)]).multibuyCents).toBe(4500);
    expect(quote([line(10000, 4, true)]).multibuyPercent).toBe(20);
    expect(quote([line(10000, 4, true)]).multibuyCents).toBe(8000);
  });

  test("equipment-only carts never get multibuy, whatever the quantity", () => {
    const q = quote([line(1500, 6, false)]);
    expect(q.multibuyUnits).toBe(0);
    expect(q.multibuyPercent).toBe(0);
    expect(q.multibuyCents).toBe(0);
  });

  test("pens and unknown (fail-closed) lines do not count toward thresholds", () => {
    // 1 Range + 3 non-Range = still below the 2-item tier.
    const q = quote([line(10000, 1, true), line(9000, 3, false)]);
    expect(q.multibuyUnits).toBe(1);
    expect(q.multibuyCents).toBe(0);
  });

  test("equipment quantities cannot push a Range line over a tier boundary", () => {
    // 1 Range + 1 equipment ≠ 2 units.
    const q = quote([line(10000, 1, true), line(2000, 1, false)]);
    expect(q.multibuyPercent).toBe(0);
  });

  test("crypto discount still applies to the whole subtotal when combined", () => {
    // 2 × $100 Range (10% stack = $20) + $15 equipment; crypto 10% on $215 = $21.50.
    const q = quote([line(10000, 2, true), line(1500, 1, false)], "crypto");
    expect(q.multibuyCents).toBe(2000);
    expect(q.cryptoCents).toBe(2150);
  });

  test("combined cap still applies and splits proportionally", () => {
    // 4 × $100 Range: stack 20% = $80, crypto 10% = $40 → raw $120, cap 20% of $400 = $80.
    const q = quote([line(10000, 4, true)], "crypto");
    expect(q.capApplied).toBe(true);
    expect(q.multibuyCents + q.cryptoCents).toBe(8000);
    // Split follows the raw shares: 80/120 of the cap to multibuy.
    expect(q.multibuyCents).toBe(Math.round((8000 * 8000) / 12000));
  });

  test("legacy lines without the flag keep their existing behaviour", () => {
    const q = quote([line(10000, 2)]);
    expect(q.multibuyUnits).toBe(2);
    expect(q.multibuyCents).toBe(2000);
  });
});

describe("client cart lines derive eligibility from catalogue facts", () => {
  const product = (catalogueSection?: string) => ({ catalogueSection }) as unknown as Product;
  const getLinePrice = () => 100;

  test("Range products are eligible; equipment, pens and unknown products are not", () => {
    const lines = cartPriceLines(
      [
        { slug: "reta", quantity: 1 },
        { slug: "bac-water", quantity: 1 },
        { slug: "pen", quantity: 1 },
        { slug: "missing", quantity: 1 },
      ],
      (slug) =>
        slug === "reta"
          ? product("range")
          : slug === "bac-water"
            ? product("equipment")
            : slug === "pen"
              ? product("pens")
              : undefined,
      getLinePrice,
    );
    expect(lines.map((l) => l.multibuyEligible)).toEqual([true, false, false, false]);
  });
});

describe("server checkout pricing derives eligibility from stored catalogue sections", () => {
  /** Minimal admin stub: products + settings rows, no member benefits. */
  const stubAdmin = (products: any[]) => ({
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        then: undefined,
      };
      if (table === "products") {
        chain.eq = () => Promise.resolve({ data: products, error: null });
      }
      return chain;
    },
    rpc: async () => ({ data: 0, error: null }),
  });

  const products = [
    { slug: "reta", name: "Retatrutide", price: 100, sale_price: null, kit_price: null, product_variants: [], catalogue_section: "range", stock_quantity: 50, coming_soon: false, unlimited_stock: false },
    { slug: "bac-water", name: "BAC Water", price: 15, sale_price: null, kit_price: null, product_variants: [], catalogue_section: "equipment", stock_quantity: 50, coming_soon: false, unlimited_stock: false },
    { slug: "pen-x", name: "Pen", price: 90, sale_price: null, kit_price: null, product_variants: [], catalogue_section: "pens", stock_quantity: 50, coming_soon: false, unlimited_stock: false },
  ];

  test("mixed cart: stack rate applies to the Range subtotal only", async () => {
    const priced = await priceCheckout(
      stubAdmin(products),
      { userId: null, emails: [], emailVerified: false },
      {
        items: [
          { slug: "reta", quantity: 2 },
          { slug: "bac-water", quantity: 1 },
        ],
        shippingMethod: "express",
        paymentMethod: "payid",
      },
    );
    expect(priced.quote.multibuyUnits).toBe(2);
    expect(priced.quote.multibuyPercent).toBe(10);
    expect(priced.quote.multibuyCents).toBe(2000); // 10% of $200 Range, not $215
  });

  test("equipment and pens never count even when the client asks for them", async () => {
    const priced = await priceCheckout(
      stubAdmin(products),
      { userId: null, emails: [], emailVerified: false },
      {
        items: [
          { slug: "bac-water", quantity: 3 },
          { slug: "pen-x", quantity: 2 },
        ],
        shippingMethod: "express",
        paymentMethod: "payid",
      },
    );
    expect(priced.quote.multibuyUnits).toBe(0);
    expect(priced.quote.multibuyCents).toBe(0);
  });

  test("a stored section that is not exactly 'range' fails closed", async () => {
    const weird = [{ ...products[0], catalogue_section: "Range " }];
    const priced = await priceCheckout(
      stubAdmin(weird),
      { userId: null, emails: [], emailVerified: false },
      { items: [{ slug: "reta", quantity: 4 }], shippingMethod: "express", paymentMethod: "payid" },
    );
    expect(priced.quote.multibuyCents).toBe(0);
  });
});
