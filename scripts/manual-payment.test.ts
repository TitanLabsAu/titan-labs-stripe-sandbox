import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { canMarkManualPaid } from "../src/lib/manual-payment";

const base = { status: "processing", payment_method: "payid", payment_confirmed: false, refunded_at: null };

describe("manual Mark as paid eligibility", () => {
  test("unpaid PayID and crypto orders are eligible in any live fulfilment status", () => {
    for (const status of ["processing", "shipped", "delivered", "pending_payment"])
      for (const payment_method of ["payid", "crypto"])
        expect(canMarkManualPaid({ ...base, status, payment_method })).toBe(true);
  });
  test("paid, refunded, cancelled and card orders are excluded", () => {
    expect(canMarkManualPaid({ ...base, payment_confirmed: true })).toBe(false);
    expect(canMarkManualPaid({ ...base, refunded_at: "2026-10-14T00:00:00Z" })).toBe(false);
    expect(canMarkManualPaid({ ...base, status: "cancelled" })).toBe(false);
    expect(canMarkManualPaid({ ...base, payment_method: "card" })).toBe(false);
  });
  test("server write is conditional, never touches status, and already-paid is a no-op without emails", () => {
    const src = readFileSync("src/lib/admin.functions.ts", "utf8");
    const fn = src.slice(src.indexOf("export const adminSetPaymentConfirmed"), src.indexOf("export const adminUpdateStatus"));
    expect(fn).toContain('.eq("payment_confirmed", false)');
    expect(fn).toContain('.neq("status", "cancelled")');
    expect(fn).toContain('.is("refunded_at", null)');
    expect(fn).toContain('.in("payment_method", ["payid", "wise", "crypto"])');
    expect(fn).not.toMatch(/status:\s/);
    const noop = fn.indexOf("alreadyPaid: true");
    expect(noop).toBeGreaterThan(-1);
    expect(noop).toBeLessThan(fn.indexOf("tryOrderCheckpointEmails"));
  });
  test("zero-row write re-reads: only an already-paid eligible row is a no-op; concurrent cancel/refund throws", () => {
    const src = readFileSync("src/lib/admin.functions.ts", "utf8");
    const fn = src.slice(src.indexOf("export const adminSetPaymentConfirmed"), src.indexOf("export const adminUpdateStatus"));
    const zeroRow = fn.indexOf("if (!changed?.length)");
    expect(zeroRow).toBeGreaterThan(-1);
    const branch = fn.slice(zeroRow);
    // Re-reads the row after the conditional update matched nothing.
    expect(branch).toContain("maybeSingle()");
    // Idempotent success requires both already-paid and still eligible (not cancelled/refunded).
    expect(branch).toContain("recheck?.payment_confirmed && canMarkManualPaid(recheck)");
    // Anything else (concurrent cancellation/refund/method change) throws instead of a false success.
    expect(branch).toContain("throw new Error(");
    expect(branch.indexOf("throw new Error(")).toBeGreaterThan(branch.indexOf("alreadyPaid: true"));
  });
});
