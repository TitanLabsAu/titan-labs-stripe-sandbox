import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  buildSkus, csvCell, filterSkus, lowStockAlerts, previewAdjustment, skusToCsv, sortSkus, summarize, type RawProduct,
} from "../src/lib/inventory";

const products: RawProduct[] = [
  { id: "r", slug: "reta", name: "Retatrutide", active: true, stock_quantity: 13, catalogue_section: "range",
    product_variants: [{ id: "a", label: "10mg", stock: 10, cost: 20 }, { id: "b", label: "20mg", stock: 3 }, { id: "c", label: "30mg", stock: 0, cost: 30 }] },
  { id: "p", slug: "pen", name: "Pen", active: false, coming_soon: true, stock_quantity: 4, catalogue_section: "pens", product_variants: [] },
  { id: "e", slug: "sharps", name: "Sharps", active: true, stock_quantity: 999, catalogue_section: "equipment", unlimited_stock: true, product_variants: [] },
  { id: "u", slug: "fake", name: "Fake unlimited", active: true, stock_quantity: 2, catalogue_section: "range", unlimited_stock: true, product_variants: [] },
];
const rows = buildSkus(products, new Map([["r::b", 2]]));

describe("inventory rows", () => {
  test("one row per size, never parent plus sizes", () => {
    expect(rows.filter((r) => r.productId === "r").length).toBe(3);
    expect(summarize(rows).bySection.range.units).toBe(15); // 10+3+0 sizes + 2 range-only product, not 13 parent
  });
  test("unlimited only for Equipment and excluded from totals", () => {
    const o = summarize(rows);
    expect(rows.find((r) => r.productId === "e")!.quantity).toBeNull();
    expect(rows.find((r) => r.productId === "u")!.quantity).toBe(2);
    expect(o.untrackedSkus).toBe(1);
    expect(o.trackedUnits).toBe(10 + 3 + 0 + 4 + 2);
  });
  test("valuation only uses real costs and reports coverage", () => {
    const o = summarize(rows);
    expect(o.value).toBe(200);
    expect(o.unpricedSkus).toBe(3);
  });
  test("statuses, custom thresholds and filters", () => {
    expect(rows.find((r) => r.key === "r::b")!.status).toBe("ok"); // custom threshold 2
    expect(rows.find((r) => r.key === "r::c")!.status).toBe("out");
    const f = { search: "", section: "all" as const, status: "attention" as const, visibility: "all" as const };
    expect(filterSkus(rows, f).map((r) => r.key).sort()).toEqual(["p::base", "r::c", "u::base"]);
    expect(filterSkus(rows, { ...f, status: "all", visibility: "hidden" }).length).toBe(1);
    expect(filterSkus(rows, { ...f, status: "all", search: "20mg" }).length).toBe(1);
    expect(lowStockAlerts(rows)[0].key).toBe("r::c");
    expect(sortSkus(rows, "quantity", "asc")[0].quantity).toBe(0);
  });
});

describe("adjustment validation", () => {
  test("rejects fractional, negative, zero and below-zero", () => {
    expect(previewAdjustment(5, "receive", "1.5", "x").ok).toBe(false);
    expect(previewAdjustment(5, "receive", "-2", "x").ok).toBe(false);
    expect(previewAdjustment(5, "remove", "0", "x").ok).toBe(false);
    expect(previewAdjustment(5, "remove", "6", "x").ok).toBe(false);
    expect(previewAdjustment(5, "receive", "2", " ").ok).toBe(false);
    expect(previewAdjustment(5, "count", "5", "x").ok).toBe(false);
  });
  test("previews before/delta/after", () => {
    expect(previewAdjustment(5, "count", "0", "lost")).toMatchObject({ ok: true, before: 5, after: 0, delta: -5 });
    expect(previewAdjustment(5, "receive", "10", "delivery")).toMatchObject({ after: 15, delta: 10 });
  });
});

describe("csv", () => {
  test("escapes quotes and neutralises formulas", () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("-5")).toBe(`"'-5"`);
    expect(skusToCsv(rows).split("\r\n").length).toBe(rows.length + 1);
  });
});

describe("server and database guards", () => {
  const fns = readFileSync("src/lib/inventory.functions.ts", "utf8");
  const sql = readFileSync("drizzle/migrations/0033_inventory_ledger_and_reorder.sql", "utf8");
  const restock = readFileSync("drizzle/migrations/0034_atomic_restock_expense.sql", "utf8");
  test("every inventory server function is admin-checked", () => {
    expect(fns.match(/createServerFn/g)!.length).toBe(fns.match(/await assertAdmin/g)!.length);
  });
  test("ledger is admin-read-only and immutable; adjustments compare-and-set", () => {
    expect(sql).not.toMatch(/GRANT [^;]*INSERT[^;]*inventory_movements TO authenticated/);
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON public.inventory_movements/);
    expect(sql).toMatch(/FOR UPDATE/);
    expect(sql).toMatch(/_expected_before IS DISTINCT FROM cur/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public.adjust_inventory[^;]*anon/);
  });
  test("restock expense rejects unknown sizes instead of first-size fallback", () => {
    expect(restock).toMatch(/matches = 0 THEN RAISE/);
    expect(readFileSync("src/lib/finance.functions.ts", "utf8")).not.toMatch(/variants\[0\]/);
  });
});
