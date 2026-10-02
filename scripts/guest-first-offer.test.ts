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
