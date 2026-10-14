import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { DEFAULT_PRICING_SETTINGS as S, quoteOrder, type CodeRule, type QuoteInput } from "../src/lib/order-pricing";

const one = (cents: number, qty = 1) => ({ unitCents: cents, baseCents: cents, quantity: qty });
const base = (o: Partial<QuoteInput> = {}): QuoteInput => ({ lines: [one(10000)], shippingMethod: "express", paymentMethod: "card", ...o });
const disc = (q: ReturnType<typeof quoteOrder>) => q.baseCents - q.merchandiseCents;
const code = (o: Partial<CodeRule>): CodeRule => ({ code: "X", kind: "member", discountType: "percent", value: 10, minSpendCents: 0, combineMultibuy: false, combineCrypto: false, combineCredit: true, ...o });

describe("Foundation Member pricing", () => {
  test("5% alone", () => {
    const q = quoteOrder(base({ foundationPercent: 5 }));
    expect(q.foundationCents).toBe(500);
    expect(q.foundationCapReached).toBe(false);
  });
  test("10% multibuy + 5 = 15%", () => {
    const q = quoteOrder(base({ lines: [one(5000, 2)], foundationPercent: 5 }));
    expect(q.multibuyCents).toBe(1000);
    expect(q.foundationCents).toBe(500);
    expect(disc(q)).toBe(1500);
  });
  test("15% + 5 = 20%", () => {
    const q = quoteOrder(base({ lines: [one(5000, 3)], foundationPercent: 5 }));
    expect(disc(q)).toBe(3000);
    expect(q.foundationCents).toBe(750);
  });
  test("20% + 5 stays 20%, saving 0 with cap notice", () => {
    const q = quoteOrder(base({ lines: [one(2500, 4)], foundationPercent: 5 }));
    expect(q.foundationCents).toBe(0);
    expect(q.foundationApplied).toBe(false);
    expect(q.foundationCapReached).toBe(true);
    expect(disc(q)).toBe(2000);
    expect(q.notices.join(" ")).toContain("maximum");
  });
  test("discounts + Foundation reach 20% => referral reward units used 0", () => {
    const q = quoteOrder(base({ lines: [one(5000, 3)], foundationPercent: 5, creditUnits: 2, availableCreditUnits: 2 }));
    expect(q.foundationCents).toBe(750);
    expect(q.creditUnits).toBe(0);
    expect(q.creditCents).toBe(0);
    expect(disc(q)).toBe(3000);
  });
  test("Foundation fills cap before a reward is consumed (10% + 5% + 1 reward capped)", () => {
    const q = quoteOrder(base({ lines: [one(5000, 2)], foundationPercent: 5, creditUnits: 2, availableCreditUnits: 2 }));
    expect(q.foundationCents).toBe(500);
    expect(q.creditUnits).toBe(1);
    expect(disc(q)).toBe(2000);
  });
  test("25% code is trimmed to 20% total for members", () => {
    const q = quoteOrder(base({ code: code({ value: 25 }), foundationPercent: 5 }));
    expect(disc(q)).toBe(2000);
    expect(q.foundationCents).toBe(0);
  });
  test("fixed $15 code + 5% = 20%", () => {
    const q = quoteOrder(base({ code: code({ discountType: "fixed", value: 15 }), foundationPercent: 5 }));
    expect(q.codeCents).toBe(1500);
    expect(q.foundationCents).toBe(500);
    expect(disc(q)).toBe(2000);
  });
  test("Range kit savings count toward cap", () => {
    const q = quoteOrder(base({ lines: [{ unitCents: 85000, baseCents: 100000, quantity: 1 }], foundationPercent: 5 }));
    expect(q.kitSavingsCents).toBe(15000);
    expect(q.foundationCents).toBe(5000);
    expect(disc(q)).toBe(20000);
  });
  test("rounding in cents", () => {
    const q = quoteOrder(base({ lines: [one(3333)], foundationPercent: 5 }));
    expect(q.foundationCents).toBe(167);
    expect(q.totalCents).toBe(3333 - 167 + q.shippingCents);
  });
  test("non-members unchanged (code path still as before)", () => {
    const a = quoteOrder(base({ code: code({ value: 25 }) }));
    expect(disc(a)).toBe(2500);
    expect(a.foundationCents).toBe(0);
    const b = quoteOrder(base({ lines: [one(5000, 2)] }));
    expect(disc(b)).toBe(1000);
  });
  test("no shipping discount from Foundation", () => {
    const a = quoteOrder(base({ lines: [one(5000)] }));
    const b = quoteOrder(base({ lines: [one(5000)], foundationPercent: 5 }));
    expect(b.shippingCents).toBe(a.shippingCents);
  });
});

describe("trusted buyer wiring", () => {
  const src = readFileSync("src/lib/checkout-pricing.server.ts", "utf8");
  test("benefit derived from DB award by server user id, never input", () => {
    expect(src).toContain('from("foundation_members")');
    expect(src).toContain("foundationBenefitFor(admin, buyer.userId)");
    expect(src).not.toMatch(/input\.foundation/);
  });
  test("lookup failure throws retriable message", () => {
    expect(src).toContain("couldn't confirm your member benefits");
  });
  test("client quote helpers do not accept a founder flag from callers", () => {
    for (const f of ["src/lib/checkout.functions.ts", "src/lib/orders.functions.ts", "src/lib/stripe.functions.ts"])
      expect(readFileSync(f, "utf8")).not.toContain("foundationPercent");
  });
});
void S;
