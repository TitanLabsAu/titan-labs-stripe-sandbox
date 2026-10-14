/** Pure helpers for matching Stripe key modes. Never returns or logs secret values. */
export type StripeKeyMode = "test" | "live";

export function publishableKeyMode(key: string | undefined | null): StripeKeyMode | null {
  const k = (key ?? "").trim();
  if (/^pk_live_[A-Za-z0-9]+$/.test(k)) return "live";
  if (/^pk_test_[A-Za-z0-9]+$/.test(k)) return "test";
  return null;
}

export function secretKeyMode(key: string | undefined | null): StripeKeyMode | null {
  const k = (key ?? "").trim();
  if (/^(sk|rk)_live_/.test(k)) return "live";
  if (/^(sk|rk)_test_/.test(k)) return "test";
  return null;
}

export type StripePublicConfig =
  | { ok: true; publishableKey: string; mode: StripeKeyMode; source: "runtime" | "build" }
  | { ok: false; reason: "missing" | "invalid" | "mode_mismatch" };

/**
 * Runtime STRIPE_PUBLISHABLE_KEY wins; the build-time key is the fallback.
 * Card payments are only offered when the chosen key's mode matches the secret key's mode.
 */
export function resolveStripePublicConfig(input: {
  runtimeKey: string | undefined;
  buildKey: string | undefined;
  secretKey: string | undefined;
}): StripePublicConfig {
  const runtime = input.runtimeKey?.trim();
  const chosen = runtime ? runtime : input.buildKey?.trim();
  const source = runtime ? "runtime" : "build";
  if (!chosen || !input.secretKey) return { ok: false, reason: "missing" };
  const pMode = publishableKeyMode(chosen);
  const sMode = secretKeyMode(input.secretKey);
  if (!pMode || !sMode) return { ok: false, reason: "invalid" };
  if (pMode !== sMode) return { ok: false, reason: "mode_mismatch" };
  return { ok: true, publishableKey: chosen, mode: pMode, source };
}
