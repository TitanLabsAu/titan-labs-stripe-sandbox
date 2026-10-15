import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { freeShippingProgress } from "../src/components/CartExtras";

const sheet = readFileSync("src/components/CartSheet.tsx", "utf8");

describe("cart member quote auth scoping (regression)", () => {
  test("query key includes the reactive user id and the exact items", () => {
    expect(sheet).toContain('queryKey: ["cart-member-quote", userId, JSON.stringify(quoteItems)]');
  });
  test("query is only enabled for a signed-in user with an open, non-empty cart", () => {
    expect(sheet).toContain("enabled: open && items.length > 0 && Boolean(userId)");
  });
  test("no placeholderData — a stale/other-user quote is never shown as confirmed", () => {
    expect(sheet).not.toContain("placeholderData");
  });
  test("cached member quotes are removed on any auth state change", () => {
    expect(sheet).toContain('queryClient.removeQueries({ queryKey: ["cart-member-quote"] })');
    expect(sheet).toContain("supabase.auth.onAuthStateChange");
  });
  test("cart is labelled as an estimate (or checking) until a fresh server quote arrives", () => {
    expect(sheet).toContain("Checking your member benefits");
    expect(sheet).toContain("Estimate only");
  });
  test("queryFn does not decide identity itself — the server fn authenticates", () => {
    expect(sheet).not.toContain("supabase.auth.getSession();\n      if");
  });
});

describe("free shipping meter matches checkout eligibility", () => {
  test("cart passes the quote's remaining-to-free-shipping, not a client-computed total", () => {
    expect(sheet).toContain("<FreeShippingMeter remaining={quote.remainingForFreeShippingCents / 100} club={quote.clubFreeShipping === true} />");
    expect(sheet).not.toContain("<FreeShippingMeter amount=");
  });
  test("progress maths: remaining clamps at zero and caps at 100%", () => {
    expect(freeShippingProgress(40, 150)).toEqual({ left: 40, progress: (110 / 150) * 100 });
    expect(freeShippingProgress(0, 150)).toEqual({ left: 0, progress: 100 });
    expect(freeShippingProgress(-5, 150)).toEqual({ left: 0, progress: 100 });
    expect(freeShippingProgress(200, 150).progress).toBe(0);
  });
});
