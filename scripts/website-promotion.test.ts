import { describe, expect, test } from "bun:test";
import {
  parseWebsitePromotion,
  validateWebsitePromotion,
  websiteSalePrice,
  readWebsitePromotion,
} from "../src/lib/website-promotion";
import { toProductWithPromotion } from "../src/lib/catalog.functions";
import { priceCheckout } from "../src/lib/checkout-pricing.server";
const id = "12345678-1234-4234-8234-123456789001",
  excluded = "12345678-1234-4234-8234-123456789002";
const sale = validateWebsitePromotion({
  enabled: true,
  title: "Christmas Sale",
  percent: 20,
  excludedProductIds: [excluded],
});
const products = [
  {
    id,
    slug: "pen",
    name: "Pen",
    price: 40,
    sale_price: null,
    catalogue_section: "equipment",
    stock_quantity: 99,
    image_url: "/pen.webp",
    product_variants: [],
  },
  {
    id: excluded,
    slug: "case",
    name: "Case",
    price: 25,
    sale_price: null,
    catalogue_section: "equipment",
    stock_quantity: 99,
    product_variants: [],
  },
];
function db(
  body: unknown = JSON.stringify(sale),
  error: unknown = null,
  rows = products,
) {
  return {
    from(table: string) {
      const c: any = {
        select: () => c,
        in: () => c,
        eq: () => c,
        maybeSingle: async () => ({
          data: table === "site_content" ? { body } : null,
          error: table === "site_content" ? error : null,
        }),
        then: (ok: any) =>
          Promise.resolve({
            data: table === "products" ? rows : null,
            error: null,
          }).then(ok),
      };
      return c;
    },
    rpc: async () => ({ data: 0, error: null }),
  };
}

describe("website promotion prices", () => {
  test("default is off and invalid configuration cannot enable a sale", () => {
    expect(parseWebsitePromotion(undefined).enabled).toBe(false);
    for (const percent of [0, 100, -1, NaN, Infinity, 2.5])
      expect(() => validateWebsitePromotion({ ...sale, percent })).toThrow();
    expect(
      parseWebsitePromotion('{"enabled":true,"percent":100}').enabled,
    ).toBe(false);
  });
  test("all catalogue sections share the same rule and cents rounding", () => {
    expect(websiteSalePrice(40, null, id, sale)).toBe(32);
    expect(websiteSalePrice(25, null, id, sale)).toBe(20);
    expect(websiteSalePrice(19.99, null, id, sale)).toBe(15.99);
    expect(websiteSalePrice(0.01, null, id, sale)).toBe(0.01);
  });
  test("best price wins without compounding; exclusion and off restore individual prices", () => {
    expect(websiteSalePrice(40, 35, id, sale)).toBe(32);
    expect(websiteSalePrice(40, 30, id, sale)).toBe(30);
    expect(websiteSalePrice(40, 35, excluded, sale)).toBe(35);
    expect(websiteSalePrice(40, null, excluded, sale)).toBe(40);
    expect(websiteSalePrice(40, null, id, { ...sale, enabled: false })).toBe(
      40,
    );
  });
  test("catalogue variants preserve colour photos and original prices", () => {
    const p = toProductWithPromotion(
      {
        ...products[0],
        product_variants: [
          { id: "blue", label: "Blue", price: 40, image: "/blue.webp" },
          {
            id: "purple",
            label: "Purple",
            price: 50,
            salePrice: 35,
            image: "/purple.webp",
          },
        ],
      },
      sale,
    );
    expect(p.price).toBe(32);
    expect(p.wasPrice).toBe(40);
    expect(p.variants?.find((v) => v.id === "blue")?.salePrice).toBe(32);
    expect(p.variants?.find((v) => v.id === "purple")?.salePrice).toBe(35);
    expect(p.variants?.find((v) => v.id === "purple")?.image).toBe(
      "/purple.webp",
    );
    expect(products[0].price).toBe(40);
  });
  test("trusted checkout discounts eligible lines and respects exclusions without browser prices", async () => {
    const out = await priceCheckout(
      db(),
      { userId: null, emails: [], emailVerified: false },
      {
        items: [
          { slug: "pen", quantity: 2 },
          { slug: "case", quantity: 1 },
        ],
        shippingMethod: "standard",
        paymentMethod: "payid",
      },
    );
    expect(out.lines.map((l) => l.unit_price)).toEqual([32, 25]);
    expect(out.quote.itemsCents).toBe(8900);
  });
  test("checkout applies the same rule to variants, honours lower sales, and restores prices when off", async () => {
    const rows = [
      {
        ...products[0],
        product_variants: [
          {
            id: "purple",
            label: "Purple",
            price: 40,
            salePrice: 30,
            stock: 99,
          },
        ],
      },
    ];
    const buyer = { userId: null, emails: [], emailVerified: false };
    const input = {
      items: [{ slug: "pen", variantId: "purple", quantity: 1 }],
      shippingMethod: "standard" as const,
      paymentMethod: "payid" as const,
    };
    const discounted = await priceCheckout(
      db(JSON.stringify(sale), null, rows as never),
      buyer,
      input,
    );
    expect(discounted.lines[0].unit_price).toBe(30);
    const off = await priceCheckout(
      db(JSON.stringify({ ...sale, enabled: false }), null, rows as never),
      buyer,
      input,
    );
    expect(off.lines[0].unit_price).toBe(30);
    const original = await priceCheckout(
      db(JSON.stringify({ ...sale, enabled: false })),
      buyer,
      { ...input, items: [{ slug: "pen", quantity: 1 }] },
    );
    expect(original.lines[0].unit_price).toBe(40);
  });
  test("checkout stops if sale prices cannot be confirmed", async () => {
    await expect(
      readWebsitePromotion(db(undefined, { message: "offline" })),
    ).rejects.toThrow("confirm website sale prices");
    await expect(readWebsitePromotion(db("bad JSON"))).rejects.toThrow(
      "invalid",
    );
  });
});
