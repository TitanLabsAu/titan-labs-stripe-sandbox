import { describe, expect, test } from "bun:test";
import { DEFAULT_PRICING_SETTINGS as S, assertExpectedTotal, quoteOrder, sanitizeClub, type ClubBenefit } from "../src/lib/order-pricing";
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
