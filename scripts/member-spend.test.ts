import { describe, expect, it } from "bun:test";
import { canArchiveOrder, countsTowardSpend, memberSpend } from "../src/lib/manual-payment";

const o = (x: any) => ({ status: "processing", payment_method: "payid", payment_confirmed: true, refunded_at: null, total: 122, ...x });

describe("member spend", () => {
  it("counts only paid, non-cancelled, unrefunded orders", () => {
    const orders = [o({}), o({ status: "cancelled", total: 117.2 }), o({ payment_confirmed: false }), o({ refunded_at: "x" }), o({ status: "pending_payment" })];
    expect(memberSpend(orders)).toEqual({ count: 1, cents: 12200 });
  });
  it("cancelling a paid order reduces spend", () => {
    const a = o({ status: "delivered", total: 50 });
    expect(memberSpend([a]).cents).toBe(5000);
    expect(memberSpend([{ ...a, status: "cancelled" }]).cents).toBe(0);
  });
  it("archive does not change spend and is limited to unpaid/cancelled", () => {
    const paid = o({});
    expect(canArchiveOrder(paid)).toBe(false);
    const cancelled = o({ status: "cancelled" });
    expect(canArchiveOrder(cancelled)).toBe(true);
    expect(canArchiveOrder(o({ payment_confirmed: false }))).toBe(true);
    expect(canArchiveOrder({ ...cancelled, archived_at: "t" } as any)).toBe(false);
    expect(countsTowardSpend({ ...cancelled, archived_at: "t" } as any)).toBe(false);
    expect(countsTowardSpend({ ...paid, archived_at: "t" } as any)).toBe(true);
  });
});
