import { describe, expect, test } from "bun:test";
import { DEFAULT_PRICING_SETTINGS as S, quoteOrder, type ClubBenefit, type CodeRule } from "../src/lib/order-pricing";
import { stackingFromRow } from "../src/lib/checkout-pricing.server";
import { draftFromMember, isClubDraftDirty, draftToInput } from "../src/lib/titan-club-draft";
import { validateClubInput } from "../src/lib/titan-club.functions";

const line = (d: number, qty = 1, base = d) => ({ unitCents: d * 100, baseCents: base * 100, quantity: qty });
const all = { multibuy: true, crypto: true, firstOffer: true, code: true, credit: true };
const pct = (p: number, cap = 30, st: Partial<typeof all> = {}): ClubBenefit => ({ type: "percent", percent: p, maxCapPercent: cap, stacking: { ...all, ...st } });
const fixed = (c: number, cap = 30, st: Partial<typeof all> = {}): ClubBenefit => ({ type: "fixed", fixedCents: c, maxCapPercent: cap, stacking: { ...all, ...st } });
const q = (x: any = {}, lines = [line(100)], pay = "payid") => quoteOrder({ lines, shippingMethod: "express", paymentMethod: pay, ...x }, S);
const ref: CodeRule = { code: "REF1", kind: "referral", discountType: "percent", value: 5, minSpendCents: 0, combineMultibuy: true, combineCrypto: true, combineCredit: true };
const never = (r: any) => expect(r.foundationCents > 0 && r.clubCents > 0).toBe(false);

describe("Foundation never combines with Club", () => {
  test("percent Club beats Foundation: no Foundation", () => {
    const r = q({ club: pct(10), foundationPercent: 5 }); never(r);
    expect(r.clubCents).toBe(1000); expect(r.foundationCents).toBe(0);
  });
  test("fixed Club smaller than Foundation: normal branch, standard cap", () => {
    const r = q({ club: fixed(200), foundationPercent: 5 }); never(r);
    expect(r.foundationCents).toBe(500); expect(r.capPercent).toBe(20);
  });
  test("many combos never both positive", () => {
    for (const club of [pct(5), pct(25), fixed(300), fixed(5000), pct(15, 30, { multibuy: false })])
      for (const lines of [[line(100)], [line(100, 4)], [line(800, 1, 1000)]])
        for (const pay of ["payid", "crypto"]) never(q({ club, foundationPercent: 5 }, lines, pay));
  });
});

describe("each stacking switch", () => {
  test("multibuy off", () => {
    const on = q({ club: pct(10) }, [line(100, 4)]), off = q({ club: pct(10, 30, { multibuy: false }) }, [line(100, 4)]);
    expect(on.multibuyCents).toBeGreaterThan(0);
    expect(off.clubCents > 0 ? off.multibuyCents : 0).toBe(0);
  });
  test("crypto off", () => {
    const r = q({ club: pct(25, 30, { crypto: false }) }, [line(100)], "crypto");
    expect(r.cryptoCents).toBe(0); expect(r.clubCents).toBe(2500);
  });
  test("crypto on stacks up to personal cap", () => {
    expect(q({ club: pct(25, 30) }, [line(100)], "crypto").itemsCents - q({ club: pct(25, 30) }, [line(100)], "crypto").merchandiseCents).toBe(3000);
  });
  test("first offer off: not consumed when club wins", () => {
    const r = q({ club: pct(25, 30, { firstOffer: false }), firstOfferEligible: true });
    expect(r.firstOfferApplied).toBe(false); expect(r.clubCents).toBe(2500);
  });
  test("code off keeps referral attribution with zero saving", () => {
    const r = q({ club: pct(25, 30, { code: false }), code: ref });
    expect(r.code).toBe("REF1"); expect(r.codeCents).toBe(0); expect(r.clubCents).toBe(2500);
  });
  test("credit off consumes no referral rewards", () => {
    const r = q({ club: pct(25, 30, { credit: false }), creditUnits: 2, availableCreditUnits: 2 });
    expect(r.creditUnits).toBe(0); expect(r.clubCents).toBe(2500);
  });
  test("club allow can't bypass global code rule (code+multibuy off globally)", () => {
    const r = q({ club: pct(5), code: { ...ref, combineMultibuy: false } }, [line(100, 4)]);
    expect(r.codeCents > 0 && r.multibuyCents > 0).toBe(false);
  });
  test("tie prefers no consumable use", () => {
    const r = q({ club: pct(10, 20), creditUnits: 1, availableCreditUnits: 1 });
    expect(r.totalCents).toBeLessThanOrEqual(q({ creditUnits: 1, availableCreditUnits: 1 }).totalCents);
  });
});

describe("regressions & trust", () => {
  test("guest / no club unchanged", () => expect(q({ foundationPercent: 5 }).totalCents).toBe(q({ club: null, foundationPercent: 5 }).totalCents));
  test("legacy row (no columns) = all allowed", () => expect(stackingFromRow({})).toEqual(all));
  test("DB false values honoured", () => expect(stackingFromRow({ stack_code: false }).code).toBe(false));
  test("tampered foundation key rejected", () => {
    const base = { userId: "11111111-1111-1111-1111-111111111111", type: "percent" as const, percent: 5, maxCapPercent: 20, active: true, note: "" };
    expect(validateClubInput({ ...base, stacking: { ...all, foundation: true } as any })).toMatch(/Foundation/);
    expect(validateClubInput({ ...base, stacking: { ...all, code: "yes" } as any })).toMatch(/stacking/);
    expect(validateClubInput({ ...base, stacking: all })).toBeNull();
  });
  test("draft keeps policy through inactive edit/dirty/save input", () => {
    const m: any = { userId: "u", name: "Demo", email: null, type: "percent", percent: 5, fixedCents: 0, maxCapPercent: 20, active: false, note: "", stacking: { ...all, crypto: false } };
    const d = draftFromMember(m);
    expect(isClubDraftDirty(d, m)).toBe(false);
    const re = { ...d, active: true, stacking: { ...d.stacking, code: false } };
    expect(isClubDraftDirty(re, m)).toBe(true);
    expect(draftToInput(re).stacking).toEqual({ ...all, crypto: false, code: false });
  });
});
