import { describe, expect, test } from "bun:test";
import {
  equipmentOptionAvailability,
  optionalEquipmentFor,
  ownedEquipmentLine,
  sanitizeOptionalEquipment,
  validateOptionalEquipment,
} from "../src/lib/optional-equipment";
import { kitOfferSource, penCompanionSource, V2_PEN_SLUG } from "../src/lib/pen-companion";
import { flowLineKey, coerceCartItems, type CartItem } from "../src/lib/cart";
import { cartLineKey, type Product } from "../src/lib/products";
import { draftToPayload, toDraft } from "../src/components/AdminProducts";
import { defaultEquipmentList } from "../src/components/OptionalEquipmentEditor";
import { priceCheckout } from "../src/lib/checkout-pricing.server";

const base = { image: "", alt: "", blurb: "", details: [] as string[] };
const rangeKit: Product = { ...base, slug: "range-starter-kit", name: "Range Starter Kit", price: 25, stock: 5, catalogueSection: "equipment" };
const penKit: Product = { ...base, slug: "pen-starter-kit", name: "Pen Starter Kit", price: 30, stock: 5, catalogueSection: "equipment" };
const sharps: Product = { ...base, slug: "sharps", name: "Sharps", price: 12, stock: 0, catalogueSection: "equipment" };
const needles: Product = {
  ...base, slug: "pen-pins", name: "Pen Pins", price: 10, catalogueSection: "equipment",
  variants: [
    { id: "6mm", label: "6 mm", price: 10, stock: 3 },
    { id: "8mm", label: "8 mm", price: 11, stock: 0 },
    { id: "4mm", label: "4 mm", price: 9, stock: 2, comingSoon: true },
  ],
};
const v2: Product = { ...base, slug: V2_PEN_SLUG, name: "V2", price: 65, catalogueSection: "pens", variants: [{ id: "blue", label: "Blue", price: 65, stock: 4 }] };
const range: Product = { ...base, slug: "klow", name: "KLOW", price: 100, catalogueSection: "range",
  variants: [{ id: "10mg", label: "10mg", price: 100, stock: 9 }, { id: "20mg", label: "20mg", price: 150, stock: 9 }] };
const pens: Product = { ...base, slug: "reta-30", name: "Reta pen", price: 220, catalogueSection: "pens" };
const catalogue = [rangeKit, penKit, sharps, needles, v2, range, pens];
const slugs = (o: ReturnType<typeof optionalEquipmentFor>) => o.map((x) => x.product.slug);

const flowPen = (parentVariant: string | null): CartItem => {
  const source = penCompanionSource("klow", parentVariant);
  return { key: flowLineKey(V2_PEN_SLUG, "blue", source), slug: V2_PEN_SLUG, quantity: 1, variantId: "blue", pack: "single", source };
};

describe("default preserves the existing starter-kit offer until edited", () => {
  test("Range → Range Starter Kit, Pens → Pen Starter Kit, Equipment → nothing", () => {
    expect(slugs(optionalEquipmentFor(range, catalogue, [], "10mg"))).toEqual(["range-starter-kit"]);
    expect(slugs(optionalEquipmentFor(pens, catalogue, []))).toEqual(["pen-starter-kit"]);
    expect(optionalEquipmentFor(rangeKit, catalogue, [])).toEqual([]);
  });
  test("starter-kit switch off still hides the default offer", () => {
    expect(optionalEquipmentFor({ ...range, starterKitEnabled: false }, catalogue, [], "10mg")).toEqual([]);
  });
  test("V2 pen selected switches Range kit to Pen kit (default and custom)", () => {
    expect(slugs(optionalEquipmentFor(range, catalogue, [flowPen("10mg")], "10mg"))).toEqual(["pen-starter-kit"]);
    // pen added for 10mg does not switch the 20mg offer
    expect(slugs(optionalEquipmentFor(range, catalogue, [flowPen("10mg")], "20mg"))).toEqual(["range-starter-kit"]);
    const custom = { ...range, optionalEquipment: [{ slug: "range-starter-kit", variantIds: null, parentVariantIds: null }, { slug: "sharps", variantIds: null, parentVariantIds: null }] };
    expect(slugs(optionalEquipmentFor(custom, catalogue, [flowPen("10mg")], "10mg"))).toEqual(["pen-starter-kit", "sharps"]);
  });
  test("an unedited Admin draft keeps the default (null) and the V2 pen offer on", () => {
    const d = toDraft({ id: "x", slug: "klow", name: "KLOW", price: 100, sale_price: null, promo_label: "", product_variants: [], image_url: "a", alt: "", blurb: "", description: "", details: [], categories: [], protocol: "", recon_vial_mg: null, recon_water_ml: null, recon_dose_mg: null, recon_notes: "", product_links: [], active: true, sort_order: 0, stock_quantity: 1, catalogue_section: "range" } as any);
    expect(d.optional_equipment).toBeNull();
    expect(d.v2_pen_offer_enabled).toBe(true);
    expect(draftToPayload(d).optional_equipment).toBeNull();
    expect(defaultEquipmentList(d)).toEqual([{ slug: "range-starter-kit", variantIds: null, parentVariantIds: null }]);
    expect(defaultEquipmentList({ ...d, starter_kit_enabled: false })).toEqual([]);
  });
});

describe("custom lists: order, variants and parent-variant scope", () => {
  const custom: Product = { ...range, optionalEquipment: [
    { slug: "pen-pins", variantIds: ["8mm", "6mm"], parentVariantIds: null },
    { slug: "sharps", variantIds: null, parentVariantIds: ["20mg"] },
    { slug: "range-starter-kit", variantIds: null, parentVariantIds: null },
  ] };
  test("keeps Admin order and per-parent-option scope", () => {
    expect(slugs(optionalEquipmentFor(custom, catalogue, [], "10mg"))).toEqual(["pen-pins", "range-starter-kit"]);
    expect(slugs(optionalEquipmentFor(custom, catalogue, [], "20mg"))).toEqual(["pen-pins", "sharps", "range-starter-kit"]);
    expect(optionalEquipmentFor(custom, catalogue, [], "10mg")[0]!.variantIds).toEqual(["8mm", "6mm"]);
  });
  test("an empty saved list offers nothing, ignoring the starter-kit default", () => {
    expect(optionalEquipmentFor({ ...range, optionalEquipment: [] }, catalogue, [], "10mg")).toEqual([]);
  });
  test("never offers non-Equipment, missing or self products", () => {
    const bad = { ...range, optionalEquipment: [{ slug: V2_PEN_SLUG, variantIds: null, parentVariantIds: null }, { slug: "gone", variantIds: null, parentVariantIds: null }, { slug: "klow", variantIds: null, parentVariantIds: null }] };
    expect(optionalEquipmentFor(bad, catalogue, [], "10mg")).toEqual([]);
  });
});

describe("availability", () => {
  test("sold out, coming soon and stock limit disable adding", () => {
    expect(equipmentOptionAvailability(sharps, null, []).soldOut).toBe(true);
    expect(equipmentOptionAvailability(needles, "8mm", []).canAdd).toBe(false);
    expect(equipmentOptionAvailability(needles, "4mm", []).comingSoon).toBe(true);
    const inCart: CartItem = { key: cartLineKey("pen-pins", "6mm"), slug: "pen-pins", quantity: 3, variantId: "6mm", pack: "single" };
    expect(equipmentOptionAvailability(needles, "6mm", []).canAdd).toBe(true);
    expect(equipmentOptionAvailability(needles, "6mm", [inCart]).canAdd).toBe(false);
  });
});

describe("cart ownership", () => {
  test("offer line is owned by parent + option, separate from manual lines, exact variant kept", () => {
    const source = kitOfferSource("klow", "10mg");
    const owned: CartItem = { key: flowLineKey("pen-pins", "6mm", source), slug: "pen-pins", quantity: 1, variantId: "6mm", pack: "single", source };
    const manual: CartItem = { key: cartLineKey("pen-pins", "6mm"), slug: "pen-pins", quantity: 2, variantId: "6mm", pack: "single" };
    expect(ownedEquipmentLine([manual, owned], "klow", "10mg", "pen-pins")?.key).toBe(owned.key);
    expect(ownedEquipmentLine([manual, owned], "klow", "20mg", "pen-pins")).toBeNull();
    const out = coerceCartItems([manual, owned], () => needles);
    expect(out).toHaveLength(2);
    expect(out.find((i) => i.source)?.variantId).toBe("6mm");
  });
  test("legacy product-only kit ownership detaches to an ordinary line without losing quantity", () => {
    const legacy: CartItem = { key: "x", slug: "range-starter-kit", quantity: 2, pack: "single", source: "kit-offer:klow" };
    const [line] = coerceCartItems([legacy], () => rangeKit);
    expect(line!.source).toBeNull();
    expect(line!.quantity).toBe(2);
  });
});

describe("save validation (server) rejects manipulated configuration", () => {
  const rows = [
    { slug: "pen-pins", catalogue_section: "equipment", product_variants: [{ id: "6mm" }, { id: "8mm" }] },
    { slug: "sharps", catalogue_section: "equipment", product_variants: [] },
    { slug: V2_PEN_SLUG, catalogue_section: "pens", product_variants: [{ id: "blue" }] },
  ];
  const parent = { slug: "klow", section: "range", variantIds: ["10mg", "20mg"] };
  test("drops non-Equipment, unknown variants and unknown parent options; collapses full selections", () => {
    const out = validateOptionalEquipment([
      { slug: V2_PEN_SLUG }, { slug: "../etc" }, { slug: "klow" },
      { slug: "pen-pins", variantIds: ["6mm", "evil"], parentVariantIds: ["10mg", "20mg"] },
      { slug: "sharps", variantIds: ["x"], parentVariantIds: ["nope"] },
      { slug: "pen-pins" },
    ], parent, rows);
    expect(out).toEqual([{ slug: "pen-pins", variantIds: ["6mm"], parentVariantIds: null }]);
  });
  test("Equipment parents can never carry add-ons (no loops); non-array keeps default", () => {
    expect(validateOptionalEquipment([{ slug: "sharps" }], { slug: "kit", section: "equipment", variantIds: [] }, rows)).toBeNull();
    expect(validateOptionalEquipment(undefined, parent, rows)).toBeNull();
    expect(sanitizeOptionalEquipment("bad")).toBeNull();
  });
});

describe("server pricing and stock stay authoritative for add-on lines", () => {
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
    { slug: "pen-pins", name: "Pen Pins", price: 10, sale_price: null, product_variants: [{ id: "6mm", label: "6 mm", price: 10, stock: 3 }], catalogue_section: "equipment", stock_quantity: 3, coming_soon: false, unlimited_stock: false },
  ];
  const buyer = { userId: null, emails: [], emailVerified: false };
  test("saved Equipment price used and Equipment excluded from Titan Stack", async () => {
    const p = await priceCheckout(stubAdmin(rows), buyer, { items: [{ slug: "klow", quantity: 1 }, { slug: "pen-pins", variantId: "6mm", quantity: 2 }], shippingMethod: "express", paymentMethod: "payid" } as any);
    expect(p.quote.itemsCents).toBe(12000);
    expect(p.quote.multibuyUnits).toBe(1);
    expect(p.quote.multibuyCents).toBe(0);
  });
  test("owned + manual lines of the same variant share one stock limit", async () => {
    await expect(priceCheckout(stubAdmin(rows), buyer, { items: [{ slug: "pen-pins", variantId: "6mm", quantity: 2 }, { slug: "pen-pins", variantId: "6mm", quantity: 2 }], shippingMethod: "express", paymentMethod: "payid" } as any)).rejects.toThrow(/stock/);
  });
  test("unknown variant is rejected", async () => {
    await expect(priceCheckout(stubAdmin(rows), buyer, { items: [{ slug: "pen-pins", variantId: "evil", quantity: 1 }], shippingMethod: "express", paymentMethod: "payid" } as any)).rejects.toThrow();
  });
});
