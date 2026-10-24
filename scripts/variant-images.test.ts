import { describe, expect, test } from "bun:test";
import { sanitizeVariantImage, variantImageFor, type Product } from "../src/lib/products";
import { toProduct } from "../src/lib/catalog.functions";
import { draftToPayload, toDraft, type Draft } from "../src/components/AdminProducts";

describe("sanitizeVariantImage", () => {
  test("blank and missing values become null (parent photo fallback)", () => {
    expect(sanitizeVariantImage(undefined)).toBeNull();
    expect(sanitizeVariantImage(null)).toBeNull();
    expect(sanitizeVariantImage("")).toBeNull();
    expect(sanitizeVariantImage("   ")).toBeNull();
  });
  test("unsafe URLs are rejected", () => {
    expect(sanitizeVariantImage("javascript:alert(1)")).toBeNull();
    expect(sanitizeVariantImage("data:text/html,x")).toBeNull();
    expect(sanitizeVariantImage("//evil.com/x.png")).toBeNull();
    expect(sanitizeVariantImage("ftp://x.com/a.png")).toBeNull();
    expect(sanitizeVariantImage("/bad path.png")).toBeNull();
    expect(sanitizeVariantImage('x"onerror="1')).toBeNull();
  });
  test("site-relative and https URLs survive, capped at 500 chars", () => {
    expect(sanitizeVariantImage("/api/public/product-image?path=a/b.jpg")).toBe("/api/public/product-image?path=a/b.jpg");
    expect(sanitizeVariantImage("https://cdn.example.com/p.png")).toBe("https://cdn.example.com/p.png");
    expect(sanitizeVariantImage(`/${"a".repeat(600)}`)).toHaveLength(500);
  });
});

const row = {
  slug: "v2-pen", name: "V2 Reusable Pen and Case", price: 89, sale_price: null, promo_label: "", kit_price: null,
  image_url: "/main.png", alt: "V2 pen", blurb: "", description: "", details: [], categories: [], protocol: "",
  recon_vial_mg: null, recon_water_ml: null, recon_dose_mg: null, recon_notes: "", product_links: [],
  stock_quantity: 9, coming_soon: false, catalogue_section: "pens", starter_kit_enabled: true, unlimited_stock: false,
  product_variants: [
    { id: "blue", label: "Blue", price: 89, stock: 3, image: "/api/public/product-image?path=v2-pen/blue.jpg" },
    { id: "purple", label: "Purple", price: 89, stock: 3, image: "" },
    { id: "grey", label: "Grey", price: 89, stock: 3 },
  ],
};

describe("catalogue serialization (toProduct)", () => {
  test("assigned variant photo is exposed; blank/missing stays null", () => {
    const p = toProduct(row);
    const byId = Object.fromEntries((p.variants ?? []).map((v) => [v.id, v]));
    expect(byId.blue.image).toBe("/api/public/product-image?path=v2-pen/blue.jpg");
    expect(byId.purple.image).toBeNull();
    expect(byId.grey.image).toBeNull();
    // Nothing else about the variants changed
    expect(byId.blue.price).toBe(89);
    expect(byId.grey.stock).toBe(3);
    expect(p.image).toBe("/main.png");
  });
  test("unsafe stored URLs never reach the storefront", () => {
    const p = toProduct({ ...row, product_variants: [{ id: "x", label: "X", price: 1, stock: 1, image: "javascript:alert(1)" }] });
    expect(p.variants?.[0]?.image).toBeNull();
  });
});

describe("variantImageFor storefront fallback", () => {
  const p = toProduct(row);
  test("selected option with a photo uses it", () => {
    expect(variantImageFor(p, "blue")).toBe("/api/public/product-image?path=v2-pen/blue.jpg");
  });
  test("option without a photo, or no selection, falls back to the main photo", () => {
    expect(variantImageFor(p, "purple")).toBe("/main.png");
    expect(variantImageFor(p, null)).toBe("/main.png");
    expect(variantImageFor(p, "unknown-id")).toBe("/main.png");
  });
});

describe("Admin draft round-trip", () => {
  test("toDraft keeps the saved photo; draftToPayload persists it and maps blank to null", () => {
    const admin = {
      id: "p1", slug: "v2-pen", name: "V2 Reusable Pen and Case", price: 89, sale_price: null, promo_label: "", kit_price: null,
      image_url: "/main.png", alt: "V2 pen", blurb: "", description: "", details: [], categories: [], protocol: "",
      recon_vial_mg: null, recon_water_ml: null, recon_dose_mg: null, recon_notes: "", product_links: [],
      active: true, sort_order: 0, stock_quantity: 9, catalogue_section: "pens", starter_kit_enabled: true, unlimited_stock: false,
      product_variants: [
        { id: "blue", label: "Blue", price: 89, stock: 3, image: "/api/public/product-image?path=v2-pen/blue.jpg" },
        { id: "grey", label: "Grey", price: 89, stock: 3 },
      ],
    };
    const draft = toDraft(admin as never);
    expect(draft.variants[0].image).toBe("/api/public/product-image?path=v2-pen/blue.jpg");
    expect(draft.variants[1].image).toBe("");
    const payload = draftToPayload(draft);
    expect(payload.product_variants[0].image).toBe("/api/public/product-image?path=v2-pen/blue.jpg");
    expect(payload.product_variants[1].image).toBeNull();
    // Other variant fields untouched
    expect(payload.product_variants[0].price).toBe(89);
    expect(payload.product_variants[1].stock).toBe(3);
  });
  test("a new blank variant row carries an empty photo that saves as null", () => {
    const draft: Draft = {
      slug: "x", name: "X", price: "10", sale_price: "", promo_label: "",
      variants: [{ id: "a", label: "Only", price: "10", stock: "1", cost: "", comingSoon: false, reconVialMg: "", reconWaterMl: "", reconDoseMg: "", reconNotes: "", image: "", contents: [], packSize: "1" }],
      image_url: "/m.png", alt: "", blurb: "", description: "", details: "", protocol: "",
      recon_vial_mg: "", recon_water_ml: "", recon_dose_mg: "", recon_notes: "",
      categories: [], links: [], active: true, sort_order: "0", stock_quantity: "1",
      catalogue_section: "pens", starter_kit_enabled: true, unlimited_stock: false,
    };
    expect(draftToPayload(draft).product_variants[0].image).toBeNull();
  });
});

describe("no other variant behaviour changes", () => {
  test("pricing and stock helpers ignore the photo field", () => {
    const p: Product = toProduct(row);
    expect(p.price).toBe(89);
    expect(p.stock).toBe(9);
    expect(p.unlimitedStock).toBe(false);
  });
});
