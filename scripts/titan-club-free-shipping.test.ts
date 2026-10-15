import { describe, expect, test } from "bun:test";
import { DEFAULT_PRICING_SETTINGS as S, __probeClubBranches, assertExpectedTotal, quoteOrder, sanitizeClub, type ClubBenefit } from "../src/lib/order-pricing";
import { pricingSnapshot } from "../src/lib/checkout-pricing.server";
import { draftFromMember, draftToInput, isClubDraftDirty, newClubDraft, clubConfirmText } from "../src/lib/titan-club-draft";
import { validateClubInput, type AdminClubMember } from "../src/lib/titan-club.functions";

const line = (d: number, qty = 1, base = d) => ({ unitCents: d * 100, baseCents: base * 100, quantity: qty });
const all = { multibuy: true, crypto: true, firstOffer: true, code: true, credit: true, foundation: false };
const pct = (p: number, fs: unknown = true, cap = 30): ClubBenefit => ({ type: "percent", percent: p, maxCapPercent: cap, stacking: all, freeShipping: fs as boolean });
const fixed = (c: number, fs: unknown = true): ClubBenefit => ({ type: "fixed", fixedCents: c, maxCapPercent: 30, stacking: all, freeShipping: fs as boolean });
const q = (x: any = {}, lines = [line(50)], ship: "express" | "standard" = "express", pay = "payid") =>
  quoteOrder({ lines, shippingMethod: ship, paymentMethod: pay, ...x }, S);

describe("Titan Club free shipping", () => {
  test("below threshold: percent Club waives express shipping, no minimum", () => {
    const r = q({ club: pct(10) });
    expect(r.shippingCents).toBe(0); expect(r.clubFreeShipping).toBe(true); expect(r.clubFreeShippingCents).toBe(2000);
    expect(r.totalCents).toBe(r.merchandiseCents); expect(r.remainingForFreeShippingCents).toBe(0);
  });
  test("fixed Club, standard shipping", () => {
    const r = q({ club: fixed(500) }, [line(30)], "standard");
    expect(r.shippingCents).toBe(0); expect(r.clubFreeShippingCents).toBe(1000);
  });
  test("above threshold: free anyway, no fake Club saving", () => {
    const r = q({ club: pct(10) }, [line(300)]);
    expect(r.shippingCents).toBe(0); expect(r.clubFreeShipping).toBe(true); expect(r.clubFreeShippingCents).toBe(0);
  });
  test("standard-discount branch wins: still free shipping", () => {
    const r = q({ club: fixed(100), foundationPercent: 5 }, [line(50)]);
    expect(r.clubCents).toBe(0); expect(r.foundationCents).toBeGreaterThan(0);
    expect(r.shippingCents).toBe(0); expect(r.clubFreeShipping).toBe(true);
  });
  test("cap unaffected: product savings identical with flag on/off", () => {
    for (const pay of ["payid", "crypto", "card", "wise"])
      for (const ship of ["express", "standard"] as const) {
        const on = q({ club: pct(25, true) }, [line(60, 4)], ship, pay), off = q({ club: pct(25, false) }, [line(60, 4)], ship, pay);
        expect(on.merchandiseCents).toBe(off.merchandiseCents);
        expect(on.capPercent).toBe(off.capPercent);
        expect(on.totalCents).toBe(off.totalCents - off.shippingCents);
        expect(on.shippingCents).toBe(0);
      }
  });
  test("guest / OFF / legacy-missing / tampered values use normal shipping", () => {
    for (const club of [null, pct(10, false), pct(10, "true"), pct(10, 1)]) {
      const r = q({ club });
      expect(r.shippingCents).toBe(2000); expect(r.clubFreeShipping).toBe(false);
    }
    expect(sanitizeClub(pct(10, "yes"))?.freeShipping).toBe(false);
    const { freeShipping: _x, ...legacy } = pct(10) as any;
    expect(q({ club: legacy }).shippingCents).toBe(2000);
  });
  test("empty cart shows no shipping saving", () => {
    const r = q({ club: pct(10) }, []);
    expect(r.totalCents).toBe(0); expect(r.clubFreeShipping).toBe(false); expect(r.clubFreeShippingCents).toBe(0);
  });
  test("stale total from before entitlement is refused", () => {
    const before = q({ club: pct(10, false) }).totalCents, after = q({ club: pct(10) }).totalCents;
    expect(() => assertExpectedTotal(before, after)).toThrow();
    expect(() => assertExpectedTotal(after, after)).not.toThrow();
  });
  test("snapshot records entitlement and actual waived amount", () => {
    const club = pct(10);
    const quote = q({ club });
    const snap: any = pricingSnapshot({ lines: [], quote, settings: S, code: null, codeError: null, availableCreditUnits: 0, firstOfferEligible: false, foundation: null, club }, null);
    expect(snap.titan_club.free_shipping).toBe(true); expect(snap.titan_club.free_shipping_waived_cents).toBe(2000);
  });
});

const member = (o: Partial<AdminClubMember> = {}): AdminClubMember => ({
  userId: "11111111-1111-1111-1111-111111111111", name: "Demo", email: null, type: "percent", percent: 10, fixedCents: 0, maxCapPercent: 30,
  active: true, note: "", assignedAt: "", updatedAt: "", revokedAt: null, stacking: all, freeShipping: false, ...o,
});

describe("editor + validation", () => {
  test("new drafts default OFF; existing value retained; dirty on toggle", () => {
    expect(newClubDraft({ userId: member().userId, name: "D", email: null }, 20).freeShipping).toBe(false);
    const d = draftFromMember(member({ freeShipping: true }));
    expect(d.freeShipping).toBe(true); expect(draftToInput(d).freeShipping).toBe(true);
    expect(isClubDraftDirty(d, member({ freeShipping: true }))).toBe(false);
    expect(isClubDraftDirty({ ...d, freeShipping: false }, member({ freeShipping: true }))).toBe(true);
    expect(clubConfirmText({ ...d }, 20)).toMatch(/free shipping: ON/);
  });
  test("strict boolean required", () => {
    const i = draftToInput(draftFromMember(member()));
    expect(validateClubInput(i)).toBeNull();
    expect(validateClubInput({ ...i, freeShipping: "true" as any })).toMatch(/free shipping/);
    expect(validateClubInput({ ...i, freeShipping: undefined as any })).toMatch(/free shipping/);
  });
});

describe("branch choice compares totals after the free-shipping waiver", () => {
  // Normal branch: Foundation 5% on $205 keeps afterPct $205 (threshold met, free shipping either way).
  // Club fixed $4 vs Foundation $10.25 near $200: club branch merchandise higher — must not win.
  test("$200 threshold: chosen merchandise is the minimum branch merchandise", () => {
    const lines = [line(205)];
    const clubOn = fixed(400, true), clubOff = fixed(400, false);
    const r = q({ club: clubOn, foundationPercent: 5 }, lines);
    const normalOnly = q({ foundationPercent: 5 }, lines);
    expect(r.merchandiseCents).toBe(Math.min(normalOnly.merchandiseCents, 20500 - 400));
    expect(r.shippingCents).toBe(0);
    void clubOff;
  });
  test("branch shipping differs: below-threshold normal vs club", () => {
    // Multibuy pushes normal below $200 (shipping charged), Club w/o multibuy stays above (free).
    const lines = [line(52, 4)];
    const st = { ...all, multibuy: false };
    const club = (fs: boolean): ClubBenefit => ({ type: "fixed", fixedCents: 100, maxCapPercent: 30, stacking: st, freeShipping: fs });
    const r = q({ club: club(true) }, lines);
    const normal = q({}, lines);
    const clubOnly = 20800 - 100;
    expect(r.merchandiseCents).toBe(Math.min(normal.merchandiseCents, clubOnly));
    expect(r.shippingCents).toBe(0);
    expect(r.totalCents).toBe(r.merchandiseCents);
  });
  test("property: free-shipping member always gets min valid branch merchandise", () => {
    let n = 0;
    for (const price of [40, 95, 150, 190, 199, 200, 201, 210, 260])
      for (const qty of [1, 2, 4])
        for (const fc of [100, 500, 2000, 6000])
          for (const fp of [0, 5])
            for (const mb of [true, false])
              for (const ship of ["express", "standard"] as const) {
                const c: ClubBenefit = { type: "fixed", fixedCents: fc, maxCapPercent: 30, stacking: { ...all, multibuy: mb }, freeShipping: true };
                let b: any = null;
                const r = __probeClubBranches(() => q({ club: c, foundationPercent: fp }, [line(price, qty)], ship), (x) => (b = x));
                expect(b.normal.shippingCents).toBe(0); expect(b.club.shippingCents).toBe(0);
                expect(r.merchandiseCents).toBe(Math.min(b.normal.merchandiseCents, b.club.merchandiseCents));
                expect(r.totalCents).toBe(r.merchandiseCents);
                n++;
              }
    expect(n).toBeGreaterThan(800);
  });
});
