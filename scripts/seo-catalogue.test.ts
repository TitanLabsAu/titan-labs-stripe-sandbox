import { describe, expect, test } from "bun:test";
import { statSync } from "node:fs";
import { productSchema } from "../src/lib/seo";
import { getProductOption, productBasePrice, type Product } from "../src/lib/products";
import { artDelivery } from "../src/lib/theme-art";

const reta = { slug: "retatrutide", name: "Retatrutide", price: 170, blurb: "", image: "/images/x.webp", categories: [],
  variants: [
    { id: "v20", label: "20mg", price: 170, salePrice: 150, stock: 5 },
    { id: "v10", label: "10mg", price: 110, salePrice: null, stock: 5 },
  ] } as unknown as Product;

describe("product schema offers", () => {
  test("variant on public sale uses the visible sale price (150, not 170)", () => {
    const offers = (productSchema(reta) as { offers: { name: string; price: number }[] }).offers;
    expect(offers.find((o) => o.name.endsWith("20mg"))!.price).toBe(150);
    expect(offers.find((o) => o.name.endsWith("20mg"))!.price).toBe(getProductOption(reta, "v20").unitPrice);
  });
  test("variant without a sale keeps its normal price", () => {
    const offers = (productSchema(reta) as { offers: { name: string; price: number }[] }).offers;
    expect(offers.find((o) => o.name.endsWith("10mg"))!.price).toBe(110);
    expect(Math.min(...offers.map((o) => o.price))).toBe(productBasePrice(reta));
  });
});

describe("testing images", () => {
  test("largest served candidates are far smaller than the originals", () => {
    for (const src of ["/images/titan-testing-laboratory.webp", "/images/titan-testing-emblem.webp"]) {
      for (const part of artDelivery(src, "100vw").srcSet!.split(",")) {
        expect(statSync(`public${part.trim().split(" ")[0]}`).size).toBeLessThan(150_000);
      }
    }
  });
});
