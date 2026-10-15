import { describe, expect, test } from "bun:test";
import { DEFAULT_PRICING_SETTINGS as S, quoteOrder, sanitizeClub, assertExpectedTotal, clubLabel, type ClubBenefit } from "../src/lib/order-pricing";

const line = (dollars: number, qty = 1, baseDollars = dollars) => ({ unitCents: dollars * 100, baseCents: baseDollars * 100, quantity: qty });
const q = (extra: any = {}, lines = [line(100)], pay = "payid") =>
  quoteOrder({ lines, shippingMethod: "express", paymentMethod: pay, ...extra }, S);
const pct = (percent: number, maxCapPercent = 20): ClubBenefit => ({ type: "percent", percent, maxCapPercent });
const fixed = (fixedCents: number, maxCapPercent = 20): ClubBenefit => ({ type: "fixed", fixedCents, maxCapPercent });

describe("Titan Club pricing", () => {
  test("non-member unchanged", () => {
    expect(q().totalCents).toBe(q({ club: null }).totalCents);
    expect(q().clubApplied).toBe(false);
    expect(q().capPercent).toBe(20);
  });
  test("percent benefit on products only (shipping excluded)", () => {
    const r = q({ club: pct(7.5) });
    expect(r.clubCents).toBe(750);
    expect(r.totalCents).toBe(10000 - 750 + r.shippingCents);
  });
  test("fixed AUD benefit", () => {
    const r = q({ club: fixed(1000) });
    expect(r.clubCents).toBe(1000);
    expect(clubLabel(r)).toBe("$10.00 off");
  });
  test("default 20% cap clips Club when stacked with multibuy", () => {
    const r = q({ club: pct(10) }, [line(100, 4)]); // multibuy 20%
    expect(r.multibuyCents).toBe(8000);
    expect(r.clubCents).toBe(0);
    expect(r.capPercent).toBe(20); // normal branch wins: personal cap does not leak
    expect(r.notices.join(" ")).toContain("Titan Club");
  });
  test("personal 30% cap allows 25% saving above site cap", () => {
    const r = q({ club: pct(25, 30) });
    expect(r.capPercent).toBe(30);
    expect(r.clubCents).toBe(2500);
    const stacked = q({ club: pct(15, 30) }, [line(100, 4)]); // 20% multibuy + 15% club -> clipped to 30%
    expect(stacked.itemsCents - stacked.merchandiseCents).toBe(12000);
    expect(stacked.clubCents).toBe(4000);
  });
  test("personal cap includes Foundation and kit savings", () => {
    const kit = q({ club: pct(10, 25), foundationPercent: 5 }, [line(800, 1, 1000)]); // kit saves 20%
    const totalSaving = kit.baseCents - kit.merchandiseCents;
    expect(totalSaving).toBe(25000);
    expect(kit.foundationCents + kit.clubCents).toBe(5000);
  });
  test("100% benefit with 100% cap never goes negative", () => {
    const r = q({ club: pct(100, 100) });
    expect(r.merchandiseCents).toBe(0);
    expect(r.totalCents).toBe(r.shippingCents);
    const f = q({ club: fixed(100000, 100) });
    expect(f.merchandiseCents).toBe(0);
  });
  test("fixed larger than cap is clipped", () => {
    expect(q({ club: fixed(5000, 20) }).clubCents).toBe(2000);
  });
  test("100% benefit clipped by default cap", () => {
    expect(q({ club: pct(100) }).clubCents).toBe(2000);
  });
  test("Club applies before referral rewards; rewards limited by personal cap", () => {
    const r = q({ club: pct(10, 30), creditUnits: 2, availableCreditUnits: 2 });
    expect(r.clubCents).toBe(1000);
    expect(r.itemsCents - r.merchandiseCents).toBeLessThanOrEqual(3000);
    expect(r.creditCents).toBeGreaterThan(0);
  });
  test("revoked/invalid benefit falls back to global cap", () => {
    for (const bad of [pct(0), pct(100.01), pct(5, 0), pct(5, 101), pct(5.555), fixed(0), fixed(10.5), fixed(100001), { type: "x", maxCapPercent: 30 } as any, pct(Number.NaN), pct(5, Number.POSITIVE_INFINITY)]) {
      expect(sanitizeClub(bad)).toBeNull();
      const r = q({ club: bad }, [line(100, 4)]);
      expect(r.capPercent).toBe(20);
      expect(r.clubCents).toBe(0);
    }
  });
  test("integer cents rounding", () => {
    const r = q({ club: pct(7.33) }, [line(33)]);
    expect(Number.isInteger(r.clubCents)).toBe(true);
    expect(r.clubCents).toBe(Math.round(3300 * 0.0733));
  });
  test("first-purchase offer still respects personal cap", () => {
    const r = quoteOrder({ lines: [line(100)], shippingMethod: "express", paymentMethod: "payid", firstOfferEligible: true, club: pct(25, 30) }, S);
    expect(r.itemsCents - r.merchandiseCents).toBeLessThanOrEqual(3000);
  });
  test("crypto path uses personal cap", () => {
    const r = q({ club: pct(25, 30) }, [line(100)], "crypto");
    expect(r.itemsCents - r.merchandiseCents).toBe(3000);
  });
  test("stale total blocks order/payment creation", () => {
    expect(() => assertExpectedTotal(12345, 12000)).toThrow(/order summary has been updated/);
    expect(() => assertExpectedTotal("12000" as any, 12000)).toThrow();
    expect(() => assertExpectedTotal(12000, 12000)).not.toThrow();
    expect(() => assertExpectedTotal(undefined, 1)).not.toThrow();
  });
});

import { clubBenefitFor } from "../src/lib/checkout-pricing.server";
const fakeDb = (cfg: any, row: any, err: any = null) => ({
  from: (t: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () =>
    t === "titan_club_settings" ? { data: cfg, error: err } : { data: row, error: null } }) }) }),
});
describe("trusted Club lookup", () => {
  const row = { benefit_type: "percent", percent: 25, fixed_cents: null, max_cap_percent: 30, active: true };
  test("guest gets nothing", async () => expect(await clubBenefitFor(fakeDb({ enabled: true }, row), null)).toBeNull());
  test("feature off by default gives nothing", async () => expect(await clubBenefitFor(fakeDb({ enabled: false }, row), "u")).toBeNull());
  test("revoked gives nothing (global cap)", async () => expect(await clubBenefitFor(fakeDb({ enabled: true }, { ...row, active: false }), "u")).toBeNull());
  test("active member gets DB benefit + personal cap", async () =>
    expect(await clubBenefitFor(fakeDb({ enabled: true }, row), "u")).toEqual({ type: "percent", percent: 25, fixedCents: 0, maxCapPercent: 30 }));
  test("not-installed tables = no club", async () => expect(await clubBenefitFor(fakeDb(null, null, { code: "PGRST205" }), "u")).toBeNull());
  test("other errors fail closed", async () => expect(clubBenefitFor(fakeDb(null, null, { code: "500", message: "x" }), "u")).rejects.toThrow(/member benefits/));
  test("checkout quote input has no client benefit fields", async () => {
    const src = await Bun.file("src/lib/checkout.functions.ts").text();
    expect(src).not.toMatch(/club|maxCap/i);
  });
});

import { clubCapFloorError } from "../src/lib/titan-club.functions";
describe("Titan Club cap floor", () => {
  test("rejects a new maximum below the website cap", () => {
    expect(clubCapFloorError(10, 20, null)).toMatch(/at least the website cap of 20%/);
    expect(clubCapFloorError(19.99, 20, 30)).not.toBeNull();
  });
  test("accepts at/above cap and preserves an unchanged existing maximum", () => {
    expect(clubCapFloorError(20, 20, null)).toBeNull();
    expect(clubCapFloorError(100, 20, null)).toBeNull();
    expect(clubCapFloorError(25, 30, 25)).toBeNull();
  });
});
