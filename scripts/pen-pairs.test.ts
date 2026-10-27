import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PEN_CASES, canChooseColour, canChoosePenColour, caseForLine, caseFromPrice, parsePenCases, resolvePenCases,
  serialisePenCases, validatePenCasesAgainst,
} from "../src/lib/pen-cases";
import { flowCaseLine, flowPenLine, linkedLineKeys, penCaseSource, penCompanionSource, repairPairedLines, starterKitSlugFor, V2_PEN_SLUG } from "../src/lib/pen-companion";
import { coerceCartItems, flowLineKey, type CartItem } from "../src/lib/cart";
import { planBulkOptionalEquipment, optionalEquipmentFor } from "../src/lib/optional-equipment";
import { filterBySection, listedInSection, sanitizeExtraSections } from "../src/lib/catalogue-sections";
import type { Product } from "../src/lib/products";
import { priceCheckout } from "../src/lib/checkout-pricing.server";

const base = { image: "", alt: "", blurb: "", details: [] as string[] };
// Mirrors the real catalogue values (read-only): $75 hard-case pen, $40 pen, $25 travel case.
const hard: Product = { ...base, slug: V2_PEN_SLUG, name: "Titan Labs V2 Reusable Pen and Case", price: 75, catalogueSection: "pens", variants: [
  { id: "hb", label: "Blue", price: 75, stock: 4 }, { id: "hp", label: "Purple", price: 75, stock: 3 }, { id: "hg", label: "Grey", price: 75, stock: 3 },
] };
const pen: Product = { ...base, slug: "titan-v2-reusable-pen", name: "Titan V2 Reusable Pen", price: 40, catalogueSection: "pens", extraSections: ["equipment"], variants: [
  { id: "pg", label: "Grey", price: 40, stock: 3 }, { id: "pb", label: "Blue", price: 40, stock: 3 }, { id: "pp", label: "Purple", price: 40, stock: 3 },
] };
const tcase: Product = { ...base, slug: "travel-case-with-ice-pack", name: "Travel Case with Ice Pack", price: 25, catalogueSection: "equipment", variants: [
  { id: "cb", label: "Blue", price: 25, stock: 20 }, { id: "cp", label: "Purple", price: 25, stock: 0 },
] };
const rangeKit: Product = { ...base, slug: "range-starter-kit", name: "Range Starter Kit", price: 25, catalogueSection: "equipment" };
const penKit: Product = { ...base, slug: "pen-starter-kit", name: "Pen Starter Kit", price: 20, catalogueSection: "equipment" };
const klow: Product = { ...base, slug: "klow", name: "KLOW", price: 160, catalogueSection: "range" };
const cat = [hard, pen, tcase, rangeKit, penKit, klow];

const line = (slug: string, variantId: string | null, source: string | null, quantity = 1): CartItem => ({
  key: source ? flowLineKey(slug, variantId, source) : `${slug}:${variantId}`, slug, quantity, variantId, pack: "single", source,
});
const penSrc = penCompanionSource("klow", null);
const caseSrc = penCaseSource("klow", null);

describe("Travel Case - Soft Case = Titan V2 Reusable Pen + Travel Case with Ice Pack", () => {
  const [h, t] = resolvePenCases(parsePenCases(undefined), cat);
  test("default pairs the two existing products at $40 + $25 = $65; hard case keeps $75 single product", () => {
    expect(t!.paired).toBe(true);
    expect(t!.pen?.product.slug).toBe("titan-v2-reusable-pen");
    expect(t!.product?.slug).toBe("travel-case-with-ice-pack");
    expect(caseFromPrice(t!)).toBe(65);
    expect(h!.paired).toBe(false);
    expect(h!.product?.slug).toBe(V2_PEN_SLUG);
    expect(caseFromPrice(h!)).toBe(75);
  });
  test("pen colours Blue/Purple/Grey and case colours Blue/Purple are chosen independently", () => {
    expect(t!.pen!.colours.map((c) => c.label)).toEqual(["Blue", "Purple", "Grey"]);
    expect(t!.colours.map((c) => c.label)).toEqual(["Blue", "Purple"]);
    expect(canChoosePenColour(t!, "pg")).toBe(true);
    expect(canChooseColour(t!, "cb")).toBe(true);
    expect(canChooseColour(t!, "cp")).toBe(false); // sold-out case colour
  });
  test("pair is unavailable if either product is missing; never offered as case-only", () => {
    const [, noPen] = resolvePenCases(parsePenCases(undefined), cat.filter((p) => p !== pen));
    expect(noPen!.available).toBe(false);
    expect(noPen!.status).toBe("pending-setup");
    const soldOutPen = { ...pen, variants: pen.variants!.map((v) => ({ ...v, stock: 0 })) };
    const [, s] = resolvePenCases(parsePenCases(undefined), [hard, soldOutPen, tcase]);
    expect(s!.status).toBe("sold-out");
  });
  test("the pen line identifies the case; the pen line drives the Pen Starter Kit switch", () => {
    const items = [line(pen.slug, "pg", penSrc), line(tcase.slug, "cb", caseSrc)];
    expect(caseForLine([h!, t!], pen.slug, "pg")?.id).toBe("travel");
    expect(caseForLine([h!, t!], V2_PEN_SLUG, "hb")?.id).toBe("hard");
    expect(flowPenLine(items, "klow", null)?.slug).toBe(pen.slug);
    expect(flowCaseLine(items, "klow", null)?.variantId).toBe("cb");
    expect(starterKitSlugFor(klow, items, null)).toBe("pen-starter-kit");
    // a case line alone never counts as a selected pen
    expect(starterKitSlugFor(klow, [line(tcase.slug, "cb", caseSrc)], null)).toBe("range-starter-kit");
  });
  test("linked lines: removing or changing quantity of either line covers both; other lines untouched", () => {
    const other = line("klow", null, null);
    const items = [line(pen.slug, "pg", penSrc), line(tcase.slug, "cb", caseSrc), other];
    expect(new Set(linkedLineKeys(items, items[0]!.key))).toEqual(new Set([items[0]!.key, items[1]!.key]));
    expect(new Set(linkedLineKeys(items, items[1]!.key))).toEqual(new Set([items[0]!.key, items[1]!.key]));
    expect(linkedLineKeys(items, other.key)).toEqual([other.key]);
    // hard-case pen has no partner
    const hardItems = [line(V2_PEN_SLUG, "hb", penSrc)];
    expect(linkedLineKeys(hardItems, hardItems[0]!.key)).toEqual([hardItems[0]!.key]);
  });
  test("restored carts: case quantity follows its pen; an orphaned case becomes an ordinary priced line", () => {
    const fixed = repairPairedLines([line(pen.slug, "pg", penSrc, 2), line(tcase.slug, "cb", caseSrc, 1)]);
    expect(fixed.find((i) => i.slug === tcase.slug)?.quantity).toBe(2);
    const orphan = coerceCartItems([line(tcase.slug, "cb", caseSrc)], (s) => cat.find((p) => p.slug === s));
    expect(orphan[0]!.source).toBeNull();
    expect(orphan[0]!.variantId).toBe("cb");
    expect(orphan[0]!.quantity).toBe(1);
    // legacy product-only marker detaches, quantity kept
    const legacy = coerceCartItems([{ ...line(tcase.slug, "cb", null), source: "pen-case:klow" }], (s) => cat.find((p) => p.slug === s));
    expect(legacy[0]!.source).toBeNull();
    // old hard-case flow carts unchanged
    const old = [line(V2_PEN_SLUG, "hb", penSrc)];
    expect(coerceCartItems(old, (s) => cat.find((p) => p.slug === s))).toBe(old);
  });
  test("Admin save: pair saved only with a real Pens pen and real variant IDs; invalid pen → pending, not case-only", () => {
    const rows = [
      { slug: pen.slug, catalogue_section: "pens", product_variants: pen.variants },
      { slug: tcase.slug, catalogue_section: "equipment", product_variants: tcase.variants },
    ];
    const saved = JSON.parse(serialisePenCases({ cases: [{ ...DEFAULT_PEN_CASES[1]!, penVariantIds: ["pb", "zz"] }] }));
    const ok = validatePenCasesAgainst(saved, rows);
    expect(ok.cases[0]!.penSlug).toBe(pen.slug);
    expect(ok.cases[0]!.penVariantIds).toEqual(["pb"]);
    const bad = validatePenCasesAgainst(saved, [rows[1]!]);
    expect(bad.cases[0]!.productSlug).toBeNull();
    expect(bad.cases[0]!.penSlug).toBeNull();
  });
});

describe("server pricing and stock for the pair", () => {
  const stubAdmin = (products: any[]) => ({
    from(table: string) {
      const chain: any = { select: () => chain, eq: () => chain, in: () => chain, maybeSingle: async () => ({ data: null, error: null }), then: undefined };
      if (table === "products") chain.eq = () => Promise.resolve({ data: products, error: null });
      return chain;
    },
    rpc: async () => ({ data: 0, error: null }),
  });
  const row = (p: Product, section: string) => ({
    slug: p.slug, name: p.name, price: p.price, sale_price: null, product_variants: p.variants ?? [], catalogue_section: section,
    stock_quantity: (p.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0) || 50, coming_soon: false, unlimited_stock: false,
  });
  const rows = [row(klow, "range"), row(pen, "pens"), row(tcase, "equipment"), row(hard, "pens")];
  const buyer = { userId: null, emails: [], emailVerified: false };
  test("pen $40 + case $25 priced from stored rows (client prices ignored); excluded from Titan Stack", async () => {
    const q = await priceCheckout(stubAdmin(rows) as any, buyer as any, { items: [
      { slug: "klow", quantity: 1 },
      { slug: pen.slug, variantId: "pg", quantity: 1, price: 1 },
      { slug: tcase.slug, variantId: "cb", quantity: 1, price: 1 },
    ], shippingMethod: "express", paymentMethod: "payid" } as any);
    expect(q.quote.itemsCents).toBe(16000 + 4000 + 2500);
    expect(q.quote.multibuyUnits).toBe(1);
  });
  test("each product's own stock is checked (sold-out case colour rejected)", async () => {
    await expect(priceCheckout(stubAdmin(rows) as any, buyer as any, { items: [
      { slug: pen.slug, variantId: "pg", quantity: 1 }, { slug: tcase.slug, variantId: "cp", quantity: 1 },
    ], shippingMethod: "express", paymentMethod: "payid" } as any)).rejects.toThrow();
    await expect(priceCheckout(stubAdmin(rows) as any, buyer as any, { items: [
      { slug: pen.slug, variantId: "pg", quantity: 4 }, { slug: tcase.slug, variantId: "cb", quantity: 4 },
    ], shippingMethod: "express", paymentMethod: "payid" } as any)).rejects.toThrow(/stock/);
  });
  test("hard case unchanged at $75", async () => {
    const q = await priceCheckout(stubAdmin(rows) as any, buyer as any, { items: [{ slug: V2_PEN_SLUG, variantId: "hb", quantity: 1 }], shippingMethod: "express", paymentMethod: "payid" } as any);
    expect(q.quote.itemsCents).toBe(7500);
  });
});

describe("bulk optional equipment", () => {
  const t = (slug: string, section: string, oe: unknown, kit = true) => ({ id: slug, slug, name: slug, catalogue_section: section, starter_kit_enabled: kit, optional_equipment: oe });
  test("adds additively, keeps defaults and per-product scopes, skips duplicates and non-eligible", () => {
    const scoped = [{ slug: "bac-water", variantIds: ["v10"], parentVariantIds: ["p1"] }];
    const plan = planBulkOptionalEquipment({ slug: "sharps", variantIds: null }, [
      t("reta", "pens", null),
      t("klow", "range", scoped),
      t("tirz", "pens", [{ slug: "sharps", variantIds: null, parentVariantIds: ["x"] }]),
      t("nokit", "range", null, false),
      t("sharps", "equipment", null),
    ]);
    const by = Object.fromEntries(plan.map((r) => [r.slug, r]));
    expect(by.reta!.action).toBe("add");
    expect(by.reta!.after.map((e) => e.slug)).toEqual(["pen-starter-kit", "sharps"]);
    expect(by.klow!.after).toEqual([...scoped, { slug: "sharps", variantIds: null, parentVariantIds: null }]);
    expect(by.tirz!.action).toBe("already-offered");
    expect(by.tirz!.after[0]!.parentVariantIds).toEqual(["x"]);
    expect(by.nokit!.after).toEqual([{ slug: "sharps", variantIds: null, parentVariantIds: null }]);
    expect(by.sharps!.action).toBe("not-eligible");
  });
  test("materialised default still behaves like the legacy starter-kit offer plus the new item", () => {
    const sharps: Product = { ...base, slug: "sharps", name: "Sharps", price: 8, catalogueSection: "equipment" };
    const [row] = planBulkOptionalEquipment({ slug: "sharps", variantIds: null }, [t("klow", "range", null)]);
    const got = optionalEquipmentFor({ ...klow, optionalEquipment: row!.after }, [...cat, sharps], [], null);
    expect(got.map((g) => g.product.slug)).toEqual(["range-starter-kit", "sharps"]);
  });
});

describe("one product in several catalogue sections", () => {
  test("listed in Pens and Equipment; pricing section stays Pens", () => {
    expect(filterBySection(cat, "equipment").map((p) => p.slug)).toContain(pen.slug);
    expect(filterBySection(cat, "pens").map((p) => p.slug)).toContain(pen.slug);
    expect(filterBySection(cat, "range").map((p) => p.slug)).toEqual(["klow"]);
    expect(listedInSection(pen, "equipment")).toBe(true);
    expect(pen.catalogueSection).toBe("pens");
  });
  test("extra sections sanitised: unknown and primary dropped, no duplicates", () => {
    expect(sanitizeExtraSections(["Equipment", "pens", "bogus", "equipment"], "pens")).toEqual(["equipment"]);
    expect(sanitizeExtraSections(null, "range")).toEqual([]);
  });
});
