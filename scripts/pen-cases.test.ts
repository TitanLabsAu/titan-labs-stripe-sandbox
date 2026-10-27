import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PEN_CASES, PEN_CASES_KEY, canChooseColour, caseForLine, parsePenCases, resolvePenCases,
  serialisePenCases, validatePenCasesAgainst,
} from "../src/lib/pen-cases";
import { flowPenLine, penCompanionSource, kitOfferSource, V2_PEN_SLUG } from "../src/lib/pen-companion";
import { equipmentOptionAvailability, optionalEquipmentFor, sanitizeOptionalEquipment, validateOptionalEquipment } from "../src/lib/optional-equipment";
import { flowLineKey, coerceCartItems, type CartItem } from "../src/lib/cart";
import type { Product } from "../src/lib/products";
import { priceCheckout } from "../src/lib/checkout-pricing.server";

const base = { image: "", alt: "", blurb: "", details: [] as string[] };
const hard: Product = { ...base, slug: V2_PEN_SLUG, name: "V2 Reusable Pen", price: 65, catalogueSection: "pens", variants: [
  { id: "g", label: "Grey", price: 65, stock: 2 }, { id: "b", label: "Blue", price: 65, stock: 4 }, { id: "p", label: "Purple", price: 70, stock: 0 },
] };
const travel: Product = { ...base, slug: "v2-travel", name: "V2 Travel", price: 75, catalogueSection: "pens", variants: [
  { id: "tb", label: "Blue", price: 75, stock: 3 }, { id: "tp", label: "Purple", price: 75, stock: 1 },
] };
const rangeKit: Product = { ...base, slug: "range-starter-kit", name: "Range Starter Kit", price: 25, catalogueSection: "equipment" };
const penKit: Product = { ...base, slug: "pen-starter-kit", name: "Pen Starter Kit", price: 20, catalogueSection: "equipment" };
const v2Kit: Product = { ...base, slug: "v2-pen-kit", name: "V2 Reusable Pen Kit", price: 0, catalogueSection: "equipment" };
const range: Product = { ...base, slug: "klow", name: "KLOW", price: 160, catalogueSection: "range" };
const cat = [hard, travel, rangeKit, penKit, v2Kit, range];
const penLine = (slug: string, v: string): CartItem => {
  const source = penCompanionSource("klow", null);
  return { key: flowLineKey(slug, v, source), slug, quantity: 1, variantId: v, pack: "single", source };
};

describe("V2 pen cases", () => {
  test("default: Hard Case uses existing V2 variants in Blue/Purple/Grey order; Travel Case is clearly not yet available", () => {
    const [h, t] = resolvePenCases(parsePenCases(undefined), cat);
    expect(h!.name).toBe("Titan Case - Hard Case");
    expect(h!.product?.slug).toBe(V2_PEN_SLUG);
    expect(h!.colours.map((c) => [c.id, c.price])).toEqual([["b", 65], ["p", 70], ["g", 65]]);
    expect(t!.name).toBe("Travel Case - Soft Case");
    expect(t!.available).toBe(false);
    expect(t!.status).toBe("pending-setup");
    expect(t!.colours).toEqual([]);
  });
  test("sold-out colour cannot be chosen; mapped travel product becomes selectable with its own prices", () => {
    const s = { cases: [DEFAULT_PEN_CASES[0]!, { ...DEFAULT_PEN_CASES[1]!, productSlug: "v2-travel", penSlug: null }] };
    const [h, t] = resolvePenCases(s, cat);
    expect(canChooseColour(h!, "p")).toBe(false);
    expect(canChooseColour(h!, "b")).toBe(true);
    expect(t!.available).toBe(true);
    expect(t!.colours.map((c) => c.label)).toEqual(["Blue", "Purple"]);
    expect(caseForLine([h!, t!], "v2-travel", "tp")?.id).toBe("travel");
  });
  test("ordering, hidden cases and colour subsets follow saved settings", () => {
    const s = { cases: [{ ...DEFAULT_PEN_CASES[0]!, variantIds: ["g", "b"] }, { ...DEFAULT_PEN_CASES[1]!, active: false }] };
    const r = resolvePenCases(s, cat);
    expect(r.length).toBe(1);
    expect(r[0]!.colours.map((c) => c.id)).toEqual(["g", "b"]);
  });
  test("unpriced or wrong-section products are never purchasable", () => {
    const zero = { ...travel, variants: travel.variants!.map((v) => ({ ...v, price: 0 })) };
    const s = { cases: [{ ...DEFAULT_PEN_CASES[1]!, productSlug: "v2-travel" }] };
    expect(resolvePenCases(s, [zero]).every((c) => !c.available)).toBe(true);
    expect(resolvePenCases(s, [{ ...travel, catalogueSection: "range" }])[0]!.status).toBe("pending-setup");
  });
  test("server save validation drops invalid product mappings and unknown variant IDs", () => {
    const parsed = JSON.parse(serialisePenCases({ cases: [
      { ...DEFAULT_PEN_CASES[0]!, variantIds: ["b", "zzz"] },
      { ...DEFAULT_PEN_CASES[1]!, productSlug: "klow" },
    ] }));
    const out = validatePenCasesAgainst(parsed, [
      { slug: V2_PEN_SLUG, catalogue_section: "pens", product_variants: [{ id: "b" }, { id: "g" }] },
      { slug: "klow", catalogue_section: "range", product_variants: [{ id: "default" }] },
    ]);
    expect(out.cases[0]!.variantIds).toEqual(["b"]);
    expect(out.cases[1]!.productSlug).toBeNull();
    expect(() => serialisePenCases({ cases: [] })).toThrow();
    expect(() => serialisePenCases({ cases: [DEFAULT_PEN_CASES[0], DEFAULT_PEN_CASES[0]] })).toThrow();
    expect(PEN_CASES_KEY).toBe("pen_case_options");
  });
  test("one flow slot per parent option: either case counts as the selected pen and switches the starter kit", () => {
    expect(flowPenLine([penLine("v2-travel", "tb")], "klow", null)?.slug).toBe("v2-travel");
    const opts = optionalEquipmentFor(range, cat, [penLine("v2-travel", "tb")], null);
    expect(opts.map((o) => o.product.slug)).toEqual(["pen-starter-kit"]);
    expect(optionalEquipmentFor(range, cat, [], null).map((o) => o.product.slug)).toEqual(["range-starter-kit"]);
  });
  test("pen-only add-ons appear only with a case selected; the $0 V2 Reusable Pen Kit is shown as unavailable", () => {
    const raw = [{ slug: "range-starter-kit", variantIds: null, parentVariantIds: null }, { slug: "v2-pen-kit", variantIds: null, parentVariantIds: null, whenPen: true }];
    expect(sanitizeOptionalEquipment(raw)?.[1]?.whenPen).toBe(true);
    const saved = validateOptionalEquipment(raw, { slug: "klow", section: "range", variantIds: [] }, [
      { slug: "range-starter-kit", catalogue_section: "equipment" }, { slug: "v2-pen-kit", catalogue_section: "equipment" },
    ]);
    expect(saved?.[1]).toEqual({ slug: "v2-pen-kit", variantIds: null, parentVariantIds: null, whenPen: true });
    const p = { ...range, optionalEquipment: saved };
    expect(optionalEquipmentFor(p, cat, [], null).map((o) => o.product.slug)).toEqual(["range-starter-kit"]);
    const withPen = optionalEquipmentFor(p, cat, [penLine(V2_PEN_SLUG, "b")], null);
    expect(withPen.map((o) => o.product.slug)).toEqual(["pen-starter-kit", "v2-pen-kit"]);
    const st = equipmentOptionAvailability(v2Kit, null, []);
    expect(st.canAdd).toBe(false);
    expect(st.unpriced).toBe(true);
    expect(equipmentOptionAvailability(penKit, null, []).canAdd).toBe(true);
  });
  test("legacy cart lines and flow lines restore unchanged", () => {
    const items = [penLine("v2-travel", "tb"), { key: "x", slug: "klow", quantity: 1, variantId: null, pack: "single" as const }];
    const out = coerceCartItems(items, (s) => cat.find((p) => p.slug === s));
    expect(out.find((i) => i.slug === "v2-travel")?.source).toBe(penCompanionSource("klow", null));
    expect(out.find((i) => i.slug === "v2-travel")?.variantId).toBe("tb");
    expect(kitOfferSource("klow", null)).toBe("kit-offer:klow:base");
  });
  const stubAdmin = (products: any[]) => ({
    from(table: string) {
      const chain: any = { select: () => chain, eq: () => chain, in: () => chain, maybeSingle: async () => ({ data: null, error: null }), then: undefined };
      if (table === "products") chain.eq = () => Promise.resolve({ data: products, error: null });
      return chain;
    },
    rpc: async () => ({ data: 0, error: null }),
  });
  const rows = [
    { slug: "klow", name: "KLOW", price: 100, sale_price: null, product_variants: [], catalogue_section: "range", stock_quantity: 50, coming_soon: false, unlimited_stock: false },
    { slug: V2_PEN_SLUG, name: "V2", price: 65, sale_price: null, product_variants: [{ id: "b", label: "Blue", price: 65, stock: 1 }], catalogue_section: "pens", stock_quantity: 1, coming_soon: false, unlimited_stock: false },
    { slug: "pen-starter-kit", name: "Pen Starter Kit", price: 20, sale_price: null, product_variants: [], catalogue_section: "equipment", stock_quantity: 0, coming_soon: false, unlimited_stock: true },
  ];
  const buyer = { userId: null, emails: [], emailVerified: false };
  test("server prices case colour + Pen Starter Kit from stored rows; client prices and stock overflow are not trusted", async () => {
    const q = await priceCheckout(stubAdmin(rows) as any, buyer as any, { items: [
      { slug: "klow", quantity: 1 }, { slug: V2_PEN_SLUG, variantId: "b", quantity: 1, price: 1 }, { slug: "pen-starter-kit", quantity: 1 },
    ], shippingMethod: "express", paymentMethod: "payid" } as any);
    expect(q.quote.itemsCents).toBe(18500);
    expect(q.quote.multibuyUnits).toBe(1);
    await expect(priceCheckout(stubAdmin(rows) as any, buyer as any, { items: [{ slug: V2_PEN_SLUG, variantId: "b", quantity: 2 }], shippingMethod: "express", paymentMethod: "payid" } as any)).rejects.toThrow(/stock/);
  });
});
