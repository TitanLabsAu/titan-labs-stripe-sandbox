import { describe, expect, test } from "bun:test";
import { resolveStripePublicConfig as r } from "../src/lib/stripe-config";

describe("stripe key mode matching", () => {
  test("build fallback when no runtime key", () => {
    expect(r({ runtimeKey: undefined, buildKey: "pk_test_abc", secretKey: "sk_test_x" })).toEqual({ ok: true, publishableKey: "pk_test_abc", mode: "test", source: "build" });
  });
  test("runtime key wins", () => {
    const c = r({ runtimeKey: "pk_live_abc", buildKey: "pk_test_abc", secretKey: "sk_live_x" });
    expect(c.ok && c.source).toBe("runtime");
  });
  test("live secret with test publishable is blocked", () => {
    expect(r({ runtimeKey: "", buildKey: "pk_test_abc", secretKey: "sk_live_x" })).toEqual({ ok: false, reason: "mode_mismatch" });
  });
  test("live publishable with test secret is blocked", () => {
    expect(r({ runtimeKey: "pk_live_abc", buildKey: undefined, secretKey: "sk_test_x" }).ok).toBe(false);
  });
  test("missing/invalid", () => {
    expect(r({ runtimeKey: undefined, buildKey: undefined, secretKey: "sk_test_x" })).toEqual({ ok: false, reason: "missing" });
    expect(r({ runtimeKey: "sk_live_oops", buildKey: undefined, secretKey: "sk_live_x" })).toEqual({ ok: false, reason: "invalid" });
  });
  test("result never contains the secret", () => {
    expect(JSON.stringify(r({ runtimeKey: "pk_live_a", buildKey: undefined, secretKey: "sk_live_SECRET" }))).not.toContain("SECRET");
  });
});
