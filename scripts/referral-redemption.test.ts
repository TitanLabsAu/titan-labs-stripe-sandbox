import { describe, expect, test } from "bun:test";
import { checkCodeRow, priceCheckout } from "../src/lib/checkout-pricing.server";

/** Minimal chainable mock of the admin Data API client used by priceCheckout. */
function mockAdmin(opts: { codeRow: any; ownerEmail?: string | null; eligible?: boolean; eligError?: boolean; usedCodeId?: string }) {
  const chain = (result: any) => {
    const c: any = {
      select: () => c, eq: () => c, in: () => c, maybeSingle: () => Promise.resolve(result),
      then: (res: any) => Promise.resolve(result).then(res),
    };
    return c;
  };
  return {
    from: (table: string) => {
      if (table === "products")
        return chain({ data: [{ slug: "reta", name: "R", price: 100, sale_price: null, product_variants: [], catalogue_section: "range", stock_quantity: 99, coming_soon: false, unlimited_stock: false }], error: null });
      if (table === "referral_settings") return chain({ data: null, error: null });
      if (table === "discount_codes") return chain({ data: opts.codeRow, error: null });
      if (table === "profiles") return chain({ data: opts.ownerEmail ? { email: opts.ownerEmail } : null, error: null });
      if (table === "foundation_members") return chain({ data: null, error: null });
      if (table === "foundation_member_settings") return chain({ data: null, error: null });
      // Titan Club tables not installed in this fixture: fail closed to "no club".
      return chain({ data: null, error: { code: "PGRST205", message: "missing" } });
    },
    rpc: (name: string, args: any) => {
      if (name === "referral_redemption_eligible")
        return Promise.resolve(opts.eligError ? { data: null, error: { message: "boom" } } : { data: opts.eligible !== false && args._code_id !== opts.usedCodeId, error: null });
      return Promise.resolve({ data: 0, error: null });
    },
  } as any;
}

const referralRow = (o: any = {}) => ({
  id: "code-1", code: "FRIEND10", code_kind: "referral", discount_type: "percent", value: 10,
  active: true, expires_at: null, times_used: 0, max_uses: 1000000, min_spend_cents: 0,
  user_id: "referrer-1", combine_multibuy: true, combine_crypto: true, combine_credit: true, ...o,
});
const input = { items: [{ slug: "reta", quantity: 1 }], shippingMethod: "standard" as const, paymentMethod: "payid" as const, code: "FRIEND10" };
const member = { userId: "buyer-1", emails: ["buyer@x.com"], emailVerified: true };

describe("referral code per-code member gate", () => {
  test("eligible signed-in member gets the referral code", async () => {
    const r = await priceCheckout(mockAdmin({ codeRow: referralRow() }), member, input);
    expect(r.codeError).toBeNull();
    expect(r.code?.rule.code).toBe("FRIEND10");
    expect(r.code?.referrerUserId).toBe("referrer-1");
  });
  test("returning buyer may use an unused code", async () => {
    const r = await priceCheckout(mockAdmin({ codeRow: referralRow(), usedCodeId: "previous-code" }), member, input);
    expect(r.code?.id).toBe("code-1");
    expect(r.codeError).toBeNull();
  });
  test("same code blocked but different code accepted", async () => {
    const blocked = await priceCheckout(mockAdmin({ codeRow: referralRow(), usedCodeId: "code-1" }), member, input);
    const allowed = await priceCheckout(mockAdmin({ codeRow: referralRow({ id: "code-2", code: "DAVE10" }), usedCodeId: "code-1" }), member, { ...input, code: "DAVE10" });
    expect(blocked.code).toBeNull();
    expect(allowed.code?.id).toBe("code-2");
  });
  test("guest cannot redeem a referral code but is not blocked from checkout", async () => {
    const r = await priceCheckout(mockAdmin({ codeRow: referralRow() }), { userId: null, emails: ["g@x.com"], emailVerified: false }, input);
    expect(r.codeError).toMatch(/sign in or join/i);
    expect(r.code).toBeNull();
    expect(r.quote.totalCents).toBeGreaterThan(0);
  });
  test("same previously used code is rejected", async () => {
    const r = await priceCheckout(mockAdmin({ codeRow: referralRow(), eligible: false }), member, input);
    expect(r.codeError).toMatch(/already used this referral code/i);
    expect(r.code).toBeNull();
  });
  test("own code by email is rejected even across accounts", async () => {
    const r = await priceCheckout(mockAdmin({ codeRow: referralRow(), ownerEmail: "Buyer@x.com" }), member, input);
    expect(r.codeError).toMatch(/own referral code/i);
    expect(r.code).toBeNull();
  });
  test("eligibility lookup failure fails closed with a retry message", async () => {
    const r = await priceCheckout(mockAdmin({ codeRow: referralRow(), eligError: true }), member, input);
    expect(r.codeError).toMatch(/try again/i);
    expect(r.code).toBeNull();
  });
  test("member-only vouchers are untouched by the referral gate", async () => {
    const row = referralRow({ code_kind: "member", user_id: "buyer-1" });
    const r = await priceCheckout(mockAdmin({ codeRow: row, eligible: false }), member, input);
    expect(r.codeError).toBeNull();
    expect(r.code?.rule.kind).toBe("member");
  });
});

describe("checkCodeRow self-referral by account id", () => {
  test("own code by id rejected; other member allowed", () => {
    const row = referralRow();
    expect((checkCodeRow(row, "referrer-1") as any).error).toMatch(/own referral code/i);
    expect((checkCodeRow(row, "buyer-1") as any).ok).toBe(true);
  });
});
