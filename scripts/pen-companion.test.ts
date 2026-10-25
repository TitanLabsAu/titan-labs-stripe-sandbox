import { describe, expect, test } from "bun:test";
import {
  V2_PEN_SLUG,
  flowPenLine,
  kitOfferSource,
  penCompanionSource,
  starterKitSlugFor,
  v2PenProduct,
} from "../src/lib/pen-companion";
import { PEN_STARTER_KIT_SLUG, RANGE_STARTER_KIT_SLUG } from "../src/lib/starter-kits";
import { flowLineKey, coerceCartItems, type CartItem } from "../src/lib/cart";
import { cartLineKey } from "../src/lib/products";
import { draftToPayload, toDraft, type Draft } from "../src/components/AdminProducts";
import type { Product } from "../src/lib/products";

const base = { image: "", alt: "", blurb: "", details: [] };
const range: Product = { ...base, slug: "klow", name: "KLOW", price: 100, catalogueSection: "range" };
const pen: Product = {
  ...base,
  slug: V2_PEN_SLUG,
  name: "V2 Reusable Pen",
  price: 65,
  catalogueSection: "pens",
  variants: [
    { id: "blue", label: "Blue", price: 65, stock: 4 },
    { id: "purple", label: "Purple", price: 65, stock: 3 },
  ],
};
const wrongSectionPen: Product = { ...pen, catalogueSection: "range" };
const noVariantPen: Product = { ...pen, variants: [] };

describe("V2 pen companion flow", () => {
  test("finds the live V2 pen only in the Pens section with orderable colours", () => {
    expect(v2PenProduct([range, pen])?.slug).toBe(V2_PEN_SLUG);
    expect(v2PenProduct([range, wrongSectionPen])).toBeNull();
    expect(v2PenProduct([range, noVariantPen])).toBeNull();
    expect(v2PenProduct([range])).toBeNull();
  });

  test("flow-owned pen line is matched by source marker only", () => {
    const flow: CartItem = {
      key: flowLineKey(V2_PEN_SLUG, "blue", penCompanionSource("klow")),
      slug: V2_PEN_SLUG,
      quantity: 1,
      variantId: "blue",
      pack: "single",
      source: penCompanionSource("klow"),
    };
    const manual: CartItem = {
      key: cartLineKey(V2_PEN_SLUG, "blue", "single"),
      slug: V2_PEN_SLUG,
      quantity: 2,
      variantId: "blue",
      pack: "single",
    };
    expect(flowPenLine([manual, flow], "klow")?.key).toBe(flow.key);
    expect(flowPenLine([manual], "klow")).toBeNull();
    expect(flowPenLine([flow], "other-product")).toBeNull();
  });

  test("flow lines never merge with manual lines of the same pen and colour", () => {
    expect(flowLineKey(V2_PEN_SLUG, "blue", penCompanionSource("klow"))).not.toBe(
      cartLineKey(V2_PEN_SLUG, "blue", "single"),
    );
    const items: CartItem[] = [
      { key: cartLineKey(V2_PEN_SLUG, "blue", "single"), slug: V2_PEN_SLUG, quantity: 2, variantId: "blue", pack: "single" },
      {
        key: flowLineKey(V2_PEN_SLUG, "blue", penCompanionSource("klow")),
        slug: V2_PEN_SLUG,
        quantity: 1,
        variantId: "blue",
        pack: "single",
        source: penCompanionSource("klow"),
      },
    ];
    const out = coerceCartItems(items, (s) => (s === V2_PEN_SLUG ? pen : null));
    expect(out).toHaveLength(2);
    expect(out.find((i) => i.source)?.quantity).toBe(1);
    expect(out.find((i) => !i.source)?.quantity).toBe(2);
  });

  test("unsafe source markers are stripped on cart restore", () => {
    const items: CartItem[] = [
      {
        key: cartLineKey(V2_PEN_SLUG, "blue", "single"),
        slug: V2_PEN_SLUG,
        quantity: 1,
        variantId: "blue",
        pack: "single",
        source: "bad marker!! <script>",
      },
    ];
    const out = coerceCartItems(items, () => pen);
    expect(out[0].source ?? null).toBeNull();
  });
});

describe("starter kit switching", () => {
  test("Range offers the Range Starter Kit until a flow pen is in the cart", () => {
    expect(starterKitSlugFor(range, [])).toBe(RANGE_STARTER_KIT_SLUG);
    const flow: CartItem = {
      key: flowLineKey(V2_PEN_SLUG, "blue", penCompanionSource("klow")),
      slug: V2_PEN_SLUG,
      quantity: 1,
      variantId: "blue",
      pack: "single",
      source: penCompanionSource("klow"),
    };
    expect(starterKitSlugFor(range, [flow])).toBe(PEN_STARTER_KIT_SLUG);
  });

  test("a manually added V2 pen does not switch the kit offer", () => {
    const manual: CartItem = {
      key: cartLineKey(V2_PEN_SLUG, "blue", "single"),
      slug: V2_PEN_SLUG,
      quantity: 1,
      variantId: "blue",
      pack: "single",
    };
    expect(starterKitSlugFor(range, [manual])).toBe(RANGE_STARTER_KIT_SLUG);
  });

  test("Pens always offer the Pen Starter Kit; Equipment offers none", () => {
    expect(starterKitSlugFor(pen, [])).toBe(PEN_STARTER_KIT_SLUG);
    const equipment: Product = { ...base, slug: "bac-water", name: "BAC Water", price: 5, catalogueSection: "equipment" };
    expect(starterKitSlugFor(equipment, [])).toBeNull();
  });

  test("kit offer source markers are per-product and well-formed", () => {
    expect(kitOfferSource("klow")).toBe("kit-offer:klow:base");
    expect(kitOfferSource("klow")).not.toBe(kitOfferSource("reta"));
  });
});

describe("variant-owned companion selections", () => {
  const reta: Product = { ...range, slug: "retatrutide", variants: [{ id: "20", label: "20mg", price: 170 }, { id: "30", label: "30mg", price: 250 }] };
  const owned = (size: string): CartItem => ({ key: flowLineKey(V2_PEN_SLUG, "blue", penCompanionSource(reta.slug, size)), source: penCompanionSource(reta.slug, size), slug: V2_PEN_SLUG, variantId: "blue", quantity: 1, pack: "single" });
  test("30mg selection adds exactly one pen and no phantom vial; 20mg stays unselected", () => {
    const items = [owned("30")];
    expect(flowPenLine(items, reta.slug, "30")?.quantity).toBe(1);
    expect(flowPenLine(items, reta.slug, "20")).toBeNull();
    expect(items.filter(i => i.slug === reta.slug)).toHaveLength(0);
    expect(items.reduce((n, i) => n + i.quantity, 0)).toBe(1);
    expect(starterKitSlugFor(reta, items, "30")).toBe(PEN_STARTER_KIT_SLUG);
    expect(starterKitSlugFor(reta, items, "20")).toBe(RANGE_STARTER_KIT_SLUG);
  });
  test("same variant copies resolve same line; different variants/toggle-off remain independent", () => {
    const items = [owned("20"), owned("30")];
    expect(flowPenLine(items, reta.slug, "30")).toBe(flowPenLine(items, reta.slug, "30"));
    expect(kitOfferSource(reta.slug, "20")).not.toBe(kitOfferSource(reta.slug, "30"));
    const off = items.filter(i => i.key !== flowPenLine(items, reta.slug, "30")?.key);
    expect(flowPenLine(off, reta.slug, "20")?.quantity).toBe(1);
    expect(flowPenLine(off, reta.slug, "30")).toBeNull();
  });
  test("ambiguous old sources detach safely while manual quantities and new ownership persist", () => {
    const old: CartItem = { ...owned("30"), source: "pen-companion:retatrutide" };
    const manual: CartItem = { ...owned("20"), source: null, key: cartLineKey(V2_PEN_SLUG, "blue", "single"), quantity: 2 };
    const out = coerceCartItems([old, manual, owned("30")], () => pen);
    expect(out.reduce((n, i) => n + i.quantity, 0)).toBe(4);
    expect(out.find(i => !i.source)?.quantity).toBe(3);
    expect(flowPenLine(out, reta.slug, "20")).toBeNull();
    expect(flowPenLine(out, reta.slug, "30")?.quantity).toBe(1);
  });
});

describe("Included Equipment serialization", () => {
  const draft: Draft = {
    slug: "klow", name: "KLOW", price: "100", sale_price: "", promo_label: "",
    variants: [
      {
        id: "5mg", label: "5mg", price: "100", stock: "10", cost: "", comingSoon: false,
        reconVialMg: "", reconWaterMl: "", reconDoseMg: "", reconNotes: "", image: "",
        contents: [
          { slug: "bac-water", name: "BAC Water 3ml", quantity: 1 },
          { slug: "alcohol-prep-pads", name: "Alcohol Prep Pads", quantity: 2 },
        ],
        packSize: "1",
      },
    ],
    image_url: "/m.png", alt: "", blurb: "", description: "", details: "", protocol: "",
    recon_vial_mg: "", recon_water_ml: "", recon_dose_mg: "", recon_notes: "",
    categories: [], links: [], active: true, sort_order: "0", stock_quantity: "10",
    catalogue_section: "range", starter_kit_enabled: true, unlimited_stock: false,
  };

  test("Range and Pens variants keep their included equipment through save", () => {
    for (const section of ["range", "pens", "equipment"] as const) {
      const payload = draftToPayload({ ...draft, catalogue_section: section });
      expect(payload.product_variants[0].contents).toEqual([
        { slug: "bac-water", name: "BAC Water 3ml", quantity: 1 },
        { slug: "alcohol-prep-pads", name: "Alcohol Prep Pads", quantity: 2 },
      ]);
    }
  });

  test("admin round-trip preserves inclusions and never adds kit pricing", () => {
    const payload = draftToPayload(draft);
    expect("kit_price" in payload).toBe(false);
    expect("kitPrice" in (payload.product_variants[0] as Record<string, unknown>)).toBe(false);
    const back = toDraft(payload as never);
    expect(back.variants[0].contents).toHaveLength(2);
  });
});
