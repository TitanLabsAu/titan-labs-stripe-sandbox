import { describe, expect, test } from "bun:test";
import {
  occursOn,
  localDate,
  isDate,
  monthDays,
  calendarPrefill,
  type CalendarEntry,
} from "../src/lib/member-calendar";
import { starterKitFor, canAddStarterKit } from "../src/lib/starter-kits";
import { getProductOption, type Product } from "../src/lib/products";
import { priceCheckout } from "../src/lib/checkout-pricing.server";
import { researchProducts } from "../src/lib/research-products";
const entry: CalendarEntry = {
  id: "a",
  product_name: "Research entry",
  dose_label: "Measurement",
  start_date: "2026-10-02",
  end_date: null,
  frequency: "weekly",
  time_of_day: null,
  notes: "",
};
const base = { image: "", alt: "", blurb: "", details: [], stock: 20 };
const range: Product = {
  ...base,
  slug: "bpc-157-10mg",
  name: "BPC-157 10mg",
  price: 100,
  catalogueSection: "range",
};
const pen: Product = {
  ...base,
  slug: "ghk-cu-50mg-disposable-pen",
  name: "GHK-CU 50mg Pre-filled Pen",
  price: 105,
  catalogueSection: "pens",
};
const kit: Product = {
  ...base,
  slug: "range-starter-kit",
  name: "Range Starter Kit",
  price: 30,
  catalogueSection: "equipment",
};
const penKit: Product = { ...kit, slug: "pen-starter-kit", name: "Pen Starter Kit" };
const catalog = [range, pen, kit, penKit];
describe("member calendar", () => {
  test("weekly and fortnightly recur within start/end", () => {
    expect(occursOn(entry, "2026-10-02")).toBe(true);
    expect(occursOn(entry, "2026-10-09")).toBe(true);
    expect(occursOn(entry, "2026-10-08")).toBe(false);
    expect(occursOn({ ...entry, frequency: "fortnightly" }, "2026-10-09")).toBe(false);
    expect(occursOn({ ...entry, frequency: "fortnightly" }, "2026-10-16")).toBe(true);
    expect(occursOn({ ...entry, end_date: "2026-10-08" }, "2026-10-09")).toBe(false);
    expect(occursOn(entry, "2026-09-25")).toBe(false);
  });
  test("monthly clamps month-end and handles leap years", () => {
    const e = { ...entry, start_date: "2024-01-31", frequency: "monthly" as const };
    expect(occursOn(e, "2024-02-29")).toBe(true);
    expect(occursOn(e, "2024-03-31")).toBe(true);
    expect(occursOn(e, "2025-02-28")).toBe(true);
    expect(occursOn(e, "2024-03-29")).toBe(false);
  });
  test("once/daily and DST-safe date arithmetic", () => {
    expect(occursOn({ ...entry, frequency: "once" }, "2026-10-03")).toBe(false);
    expect(occursOn({ ...entry, frequency: "daily" }, "2026-10-04")).toBe(true);
    expect(localDate(new Date(2026, 9, 2, 0, 10))).toBe("2026-10-02");
    expect(isDate("2026-02-30")).toBe(false);
    expect(isDate("2024-02-29")).toBe(true);
  });
  test("month grid uses Monday first and complete weeks", () => {
    const ds = monthDays(new Date(2026, 9, 15));
    expect(ds.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(ds.filter(Boolean).length).toBe(31);
    expect(ds.length % 7).toBe(0);
  });
  test("calculator handoff rejects malformed data and limits length", () => {
    expect(calendarPrefill({ product_name: 12, dose_label: "x" })).toBe(null);
    expect(
      calendarPrefill({ product_name: "x".repeat(200), dose_label: "m" })?.product_name.length,
    ).toBe(120);
  });
});
describe("starter kits and pens", () => {
  test("correct separate kit for each section, equipment excluded", () => {
    expect(starterKitFor(range, catalog)?.slug).toBe(kit.slug);
    expect(starterKitFor(pen, catalog)?.slug).toBe(penKit.slug);
    expect(starterKitFor(kit, catalog)).toBe(null);
  });
  test("per-product off and inactive kit omitted", () => {
    expect(starterKitFor({ ...range, starterKitEnabled: false }, catalog)).toBe(null);
    expect(starterKitFor(range, [range, pen, penKit])).toBe(null);
  });
  test("kit stock and coming soon enforced, no ten-pack pens", () => {
    expect(canAddStarterKit({ ...kit, stock: 0 }, [])).toBe(false);
    expect(canAddStarterKit({ ...kit, comingSoon: true }, [])).toBe(false);
    expect(
      canAddStarterKit({ ...kit, stock: 1 }, [{ key: "k", slug: kit.slug, quantity: 1 }]),
    ).toBe(false);
    expect(getProductOption(pen, null, "kit").unitPrice).toBe(105);
    expect(getProductOption(pen, null, "kit").pack).toBe("single");
  });
  test("links compound products without matching unrelated equipment", () => {
    expect(
      researchProducts({ slug: "bpc-157", title: "BPC-157", synonyms: [] }, catalog).map(
        (p) => p.slug,
      ),
    ).toEqual([range.slug]);
  });
});
const rows = catalog.map((p) => ({
  slug: p.slug,
  name: p.name,
  price: p.price,
  sale_price: null,
  kit_price: null,
  product_variants: [],
  catalogue_section: p.catalogueSection,
  stock_quantity: p.stock,
  coming_soon: false,
}));
function adminMock(products = rows) {
  return {
    from: (table: string) => {
      const result = {
        data: table === "products" ? products : table === "member_credit_ledger" ? [] : null,
        error: null,
      };
      const chain: any = {
        select: () => chain,
        in: () => chain,
        eq: () => chain,
        maybeSingle: async () => result,
        then: (resolve: any) => Promise.resolve(result).then(resolve),
      };
      return chain;
    },
    rpc: async () => ({ data: [{ available_units: 0 }], error: null }),
  };
}
const input = {
  items: [
    { slug: range.slug, quantity: 1, pack: "single" as const },
    { slug: kit.slug, quantity: 1, pack: "single" as const },
  ],
  shippingMethod: "standard" as const,
  paymentMethod: "card" as const,
};
describe("authoritative checkout", () => {
  test("starter kit charged as its own line", async () => {
    const p = await priceCheckout(adminMock(), "buyer", input);
    expect(p.lines.map((l) => l.unit_price)).toEqual([100, 30]);
    expect(p.quote.itemsCents).toBe(13000);
  });
  test("tampered ten-pack pen charged as single", async () => {
    const p = await priceCheckout(adminMock(), "buyer", {
      ...input,
      items: [{ slug: pen.slug, quantity: 1, pack: "kit" }],
    });
    expect(p.lines[0]?.unit_price).toBe(105);
  });
  test("stock enforced across split duplicate lines", async () => {
    await expect(
      priceCheckout(adminMock(), "buyer", {
        ...input,
        items: [
          { slug: kit.slug, quantity: 15 },
          { slug: kit.slug, quantity: 6 },
        ],
      }),
    ).rejects.toThrow("not enough stock");
  });
  test("unavailable and invalid quantity rejected", async () => {
    await expect(
      priceCheckout(adminMock(rows.map((r) => ({ ...r, coming_soon: true }))), "buyer", input),
    ).rejects.toThrow("coming soon");
    await expect(
      priceCheckout(adminMock(), "buyer", { ...input, items: [{ slug: kit.slug, quantity: 1.5 }] }),
    ).rejects.toThrow("quantity");
  });
  test("missing variant cannot bypass price", async () => {
    await expect(
      priceCheckout(
        adminMock(
          rows.map((r) =>
            r.slug === pen.slug
              ? {
                  ...r,
                  product_variants: [{ id: "s", price: 125, label: "Strength option", stock: 5 }],
                }
              : r,
          ) as any,
        ),
        "buyer",
        { ...input, items: [{ slug: pen.slug, quantity: 1 }] },
      ),
    ).rejects.toThrow("valid size");
  });
});
