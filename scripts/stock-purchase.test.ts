import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { centsToAud, checkPurchase, parseCents, parseQty, validatePurchasePayload, type DraftLine, type PurchaseProduct } from "../src/lib/purchase";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";
const products: PurchaseProduct[] = [
  { id: P1, name: "Reta", catalogue_section: "range", product_variants: [{ id: "v10", label: "10mg", stock: 4 }, { id: "v20", label: "20mg", stock: 0 }] },
  { id: P2, name: "Pins", catalogue_section: "equipment", unlimited_stock: true, product_variants: [] },
  { id: P3, name: "Pen", catalogue_section: "pens", stock_quantity: 2, product_variants: [] },
];
const L = (productId: string, variantId: string | null, quantity: string, cost: string): DraftLine => ({ key: `${productId}${variantId}`, productId, variantId, quantity, cost });
const opts = { mode: "line" as const, other: "", discount: "", applyStock: true };

describe("cents arithmetic", () => {
  test("parses without float error", () => {
    expect(parseCents("0.1")).toBe(10);
    expect(parseCents("0.2")).toBe(20);
    expect(parseCents("19.99")).toBe(1999);
    expect(parseCents("$1,234.5")).toBe(123450);
    for (const bad of ["-1", "1.234", "abc", "1e3"]) expect(parseCents(bad)).toBeNull();
    expect(centsToAud(30)).toBe("$0.30");
  });
  test("quantities are positive whole numbers", () => {
    expect(parseQty("3")).toBe(3);
    for (const bad of ["0", "1.5", "-2", "", "100001"]) expect(parseQty(bad)).toBeNull();
  });
});

describe("one purchase, many items", () => {
  test("total = lines + other − discount, exact cents", () => {
    const r = checkPurchase([L(P1, "v10", "3", "0.10"), L(P1, "v20", "2", "0.20"), L(P2, null, "5", "10")], products, { ...opts, other: "9.95", discount: "0.25" });
    expect(r.ok).toBe(true);
    expect(r.itemCount).toBe(3);
    expect(r.unitCount).toBe(10);
    expect(r.totalCents).toBe(10 + 20 + 1000 + 995 - 25);
  });
  test("unit cost mode multiplies per line", () => {
    expect(checkPurchase([L(P1, "v10", "3", "1.10")], products, { ...opts, mode: "unit" }).totalCents).toBe(330);
  });
  test("maps exact size by id and previews stock; unlimited untouched", () => {
    const r = checkPurchase([L(P1, "v10", "3", "1"), L(P2, null, "5", "1"), L(P3, null, "1", "1")], products, opts);
    expect(r.checks[0]).toMatchObject({ before: 4, after: 7, label: "Reta 10mg" });
    expect(r.checks[1]).toMatchObject({ untracked: true, after: null });
    expect(r.checks[2]).toMatchObject({ before: 2, after: 3 });
    expect(checkPurchase([L(P1, "v10", "3", "1")], products, { ...opts, applyStock: false }).checks[0].after).toBeNull();
  });
  test("rejects missing/unknown size, duplicates and negative total", () => {
    expect(checkPurchase([L(P1, null, "1", "1")], products, opts).ok).toBe(false);
    expect(checkPurchase([L(P1, "gone", "1", "1")], products, opts).ok).toBe(false);
    expect(checkPurchase([L(P1, "v10", "1", "1"), L(P1, "v10", "2", "1")], products, opts).checks[1].error).toMatch(/combine/i);
    expect(checkPurchase([L(P1, "v10", "1", "1")], products, { ...opts, discount: "2" }).ok).toBe(false);
  });
});

describe("server payload validation", () => {
  const base = { requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", occurredOn: "2026-10-10", otherCostsCents: 0, discountCents: 0 };
  const item = { productId: P1, variantId: "v10", quantity: 2, lineCostCents: 500 };
  test("accepts valid and computes total", () => {
    expect(validatePurchasePayload({ ...base, otherCostsCents: 100, items: [item] }).totalCents).toBe(600);
  });
  test("rejects malformed input", () => {
    for (const bad of [
      { ...base, requestId: "x", items: [item] },
      { ...base, items: [] },
      { ...base, items: [{ ...item, quantity: 1.5 }] },
      { ...base, items: [{ ...item, quantity: -1 }] },
      { ...base, items: [{ ...item, lineCostCents: 1.5 }] },
      { ...base, items: [item, item] },
      { ...base, discountCents: 600, items: [item] },
    ]) expect(() => validatePurchasePayload(bad as any)).toThrow();
  });
});

describe("database guards", () => {
  const sql = readFileSync("drizzle/migrations/0035_multi_item_stock_purchase.sql", "utf8");
  const fns = readFileSync("src/lib/finance.functions.ts", "utf8");
  test("admin-only, read-only items table", () => {
    expect(sql).toMatch(/GRANT SELECT ON public.expense_items TO authenticated/);
    expect(sql).not.toMatch(/GRANT [^;]*INSERT[^;]*expense_items TO authenticated/);
    expect(sql).toMatch(/has_role\(auth.uid\(\), 'admin'\)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public.record_stock_purchase[^;]*anon/);
    expect(fns.match(/createServerFn\(\{/g)!.length).toBe(fns.match(/await assertAdmin/g)!.length);
  });
  test("idempotent, locked, one header, strict sizes", () => {
    expect(sql).toMatch(/expenses_request_id_key/);
    expect(sql).toMatch(/'duplicate', true/);
    expect(sql).toMatch(/ORDER BY id FOR UPDATE/);
    expect((sql.match(/INSERT INTO public.expenses/g) ?? []).length).toBe(1);
    expect(sql).toMatch(/no longer exists \(nothing saved\)/);
    expect(sql).toMatch(/appears twice/);
    expect(sql).toMatch(/total::numeric \/ 100/);
  });
  test("legacy single-item path still present", () => {
    expect(fns).toMatch(/record_restock_expense/);
    expect(fns).toMatch(/adminFinanceSummary/);
  });
});
