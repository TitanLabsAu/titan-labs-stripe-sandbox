import { describe, expect, test } from "bun:test";
import { DEFAULT_PRICING_SETTINGS as S, quoteOrder } from "../src/lib/order-pricing";
import {
  ackIsUsable,
  checkoutErrorCode,
  decideBuyer,
  hashGuestToken,
  isWellFormedGuestToken,
  newGuestToken,
  ownsRow,
} from "../src/lib/guest-capability";

const line = (d: number, qty = 1) => ({ unitCents: d * 100, baseCents: d * 100, quantity: qty });
const q = (o: any) => quoteOrder({ shippingMethod: "standard" as any, paymentMethod: "payid", ...o }, S);

describe("first purchase offer pricing", () => {
  test("10% off products only for eligible buyers", () => {
    const r = q({ lines: [line(100)], firstOfferEligible: true });
    expect(r.firstOfferCents).toBe(1000);
    expect(q({ lines: [line(100)] }).firstOfferCents).toBe(0);
  });
  test("default picks the better of offer or other discounts, never both", () => {
    const r = q({ lines: [line(100, 4)], paymentMethod: "crypto", firstOfferEligible: true });
    const base = q({ lines: [line(100, 4)], paymentMethod: "crypto" });
    expect(r.totalCents).toBeLessThanOrEqual(base.totalCents);
    if (r.firstOfferApplied) expect(r.multibuyCents + r.cryptoCents).toBe(0);
  });
  test("disabled offer is ignored", () => {
    const off = { ...S, firstOffer: { ...S.firstOffer, enabled: false } };
    const r = quoteOrder({ shippingMethod: "standard" as any, paymentMethod: "payid", lines: [line(100)], firstOfferEligible: true }, off);
    expect(r.firstOfferCents).toBe(0);
  });
});

describe("guest capability", () => {
  test("tokens are random, well formed and hashed", async () => {
    const a = newGuestToken();
    expect(isWellFormedGuestToken(a)).toBe(true);
    expect(a).not.toBe(newGuestToken());
    expect(isWellFormedGuestToken("x")).toBe(false);
    expect(await hashGuestToken(a)).not.toBe(a);
  });
  test("ownership never crosses member/guest", () => {
    const m = { kind: "member", userId: "u1" } as any;
    const g = { kind: "guest", guestSessionId: "g1" } as any;
    expect(ownsRow(m, { user_id: "u1" })).toBe(true);
    expect(ownsRow(m, { user_id: "u2" })).toBe(false);
    expect(ownsRow(g, { guest_session_id: "g1" })).toBe(true);
    expect(ownsRow(g, { user_id: "u1", guest_session_id: null })).toBe(false);
    expect(ownsRow(m, null)).toBe(false);
  });
  test("decideBuyer is exported and callable", () => {
    expect(typeof decideBuyer).toBe("function");
    expect(typeof ackIsUsable).toBe("function");
    expect(checkoutErrorCode(new Error("nothing"))).toBeNull();
  });
});

import { cancelUnboundIntent } from "../src/lib/stripe-recovery";

describe("checkout regression checks", () => {
  test("expired member requires a choice; valid member cannot be downgraded", () => {
    expect(decideBuyer({ mode: "member", bearerValid: false, guestSessionValid: true })).toEqual({ error: "AUTH_EXPIRED" });
    expect(decideBuyer({ mode: "guest", bearerValid: true, guestSessionValid: true })).toEqual({ kind: "member" });
    expect(decideBuyer({ mode: "guest", bearerValid: false, guestSessionValid: false })).toEqual({ error: "GUEST_SESSION_INVALID" });
  });
  test("another guest and stale, unaccepted or linked acknowledgements are rejected", () => {
    const g = { kind: "guest", userId: null, guestSessionId: "g1" } as const;
    const ack = { guest_session_id: "g1", accepted: true, accepted_at: new Date().toISOString() };
    expect(ownsRow(g, { guest_session_id: "g2" })).toBe(false);
    expect(ackIsUsable(g, ack)).toBe(true);
    expect(ackIsUsable(g, { ...ack, guest_session_id: "g2" })).toBe(false);
    expect(ackIsUsable(g, { ...ack, accepted: false })).toBe(false);
    expect(ackIsUsable(g, { ...ack, order_id: "order" })).toBe(false);
    expect(ackIsUsable(g, { ...ack, accepted_at: new Date(Date.now() - 3 * 3600000).toISOString() })).toBe(false);
  });
  test("stacked welcome/code savings share the cap, with only two credits", () => {
    const settings = { ...S, allowCodeCrypto: true, allowCodeMultibuy: true, firstOffer: { ...S.firstOffer, combineCode: true, combineMultibuy: true, combineCrypto: true, combineCredit: true } };
    for (let units = 1; units <= 5; units++) {
      const r = quoteOrder({ shippingMethod: "express", paymentMethod: "crypto", lines: [line(100, units)], firstOfferEligible: true, creditUnits: 9, availableCreditUnits: 9, code: { code: "TEST", kind: "member", discountType: "percent", value: 5, minSpendCents: 0, combineMultibuy: true, combineCrypto: true, combineCredit: true } }, settings);
      if (r.firstOfferApplied) expect(r.multibuyCents + r.cryptoCents + r.codeCents + r.firstOfferCents + r.kitSavingsCents).toBeLessThanOrEqual(r.baseCents * .2);
      expect(r.creditCents).toBeLessThanOrEqual(2000);
    }
  });
  test("a created intent must be canceled before rewards can be released", async () => {
    let canceled = 0;
    const stripe = { paymentIntents: { cancel: async () => { canceled++; return { status: "canceled" }; }, retrieve: async () => ({ status: "succeeded" }) } };
    expect(await cancelUnboundIntent(stripe, null)).toBe(true);
    expect(canceled).toBe(0);
    expect(await cancelUnboundIntent(stripe, "pi_created")).toBe(true);
    expect(canceled).toBe(1);
    stripe.paymentIntents.cancel = async () => { throw new Error("unavailable"); };
    expect(await cancelUnboundIntent(stripe, "pi_paid")).toBe(false);
    stripe.paymentIntents.retrieve = async () => { throw new Error("unavailable"); };
    expect(await cancelUnboundIntent(stripe, "pi_unknown")).toBe(false);
  });
});
