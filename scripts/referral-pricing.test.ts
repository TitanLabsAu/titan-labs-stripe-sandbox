import { describe, expect, test } from "bun:test";
import { DEFAULT_PRICING_SETTINGS as S, quoteOrder, settingsFromRow, type CodeRule } from "../src/lib/order-pricing";

const line = (dollars: number, qty = 1, base?: number) => ({ unitCents: dollars * 100, baseCents: (base ?? dollars) * 100, quantity: qty });
const code = (o: Partial<CodeRule> = {}): CodeRule => ({
  code: "EMMA10", kind: "referral", discountType: "percent", value: 10, minSpendCents: 0,
  combineMultibuy: true, combineCrypto: true, combineCredit: true, ...o,
});
const q = (o: any) => quoteOrder({ shippingMethod: "standard" as any, paymentMethod: "payid", ...o }, S);

describe("referral pricing", () => {
  test("multi-buy + crypto never exceeds 20% cap", () => {
    const r = q({ lines: [line(100, 4)], paymentMethod: "crypto" });
    expect(r.multibuyCents + r.cryptoCents + r.kitSavingsCents).toBeLessThanOrEqual(Math.round(r.baseCents * 0.2));
    expect(r.capApplied).toBe(true);
  });
  test("single item no discount; integer cents", () => {
    const r = q({ lines: [line(33.33)] });
    expect(r.multibuyCents).toBe(0);
    expect(Number.isInteger(r.totalCents)).toBe(true);
  });
  test("zero-value code applies with no discount", () => {
    const r = q({ lines: [line(50)], code: code({ value: 0 }) });
    expect(r.codeCents).toBe(0);
    expect(r.code).toBe("EMMA10");
  });
  test("min spend blocks code", () => {
    const r = q({ lines: [line(20)], code: code({ minSpendCents: 10000 }) });
    expect(r.codeApplied).toBe(false);
  });
  test("credit capped at max units and available", () => {
    const r = q({ lines: [line(200)], creditUnits: 5, availableCreditUnits: 5 });
    expect(r.creditUnits).toBe(2);
    expect(r.creditCents).toBe(2000);
    const r2 = q({ lines: [line(200)], creditUnits: 2, availableCreditUnits: 1 });
    expect(r2.creditUnits).toBe(1);
  });
  test("credit never makes merchandise negative", () => {
    const r = q({ lines: [line(5)], creditUnits: 2, availableCreditUnits: 2 });
    expect(r.merchandiseCents).toBeGreaterThanOrEqual(0);
  });
  test("non-stacking code: customer gets better outcome", () => {
    const r = q({ lines: [line(100, 4)], code: code({ value: 5 }) });
    const none = q({ lines: [line(100, 4)] });
    expect(r.totalCents).toBeLessThanOrEqual(none.totalCents);
  });
  test("settings defaults", () => {
    const s = settingsFromRow(null);
    expect(s.maxCreditUnits).toBe(2);
    expect(s.creditUnitCents).toBe(1000);
    expect(s.combinedCapPercent).toBe(20);
    expect(s.milestoneThresholds).toEqual([5, 10, 25, 50, 100]);
  });
});
