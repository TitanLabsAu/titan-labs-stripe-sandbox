/**
 * Pure helpers for guest checkout capabilities and buyer ownership.
 * A guest capability is a short-lived random token kept in an httpOnly
 * cookie; the database stores only its SHA-256 hash.
 */
export const GUEST_COOKIE = "titan_guest_checkout";
export const GUEST_TTL_SECONDS = 2 * 60 * 60;
export const ACK_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type CheckoutMode = "member" | "guest";

export function newGuestToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isWellFormedGuestToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function hashGuestToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type BuyerIdentity =
  | { kind: "member"; userId: string; guestSessionId: null }
  | { kind: "guest"; userId: null; guestSessionId: string };

export type OwnedRow = { user_id?: string | null; guest_session_id?: string | null };

/** Ownership always comes from the server-resolved buyer, never from posted ids. */
export function ownsRow(buyer: BuyerIdentity, row: OwnedRow | null | undefined): boolean {
  if (!row) return false;
  if (buyer.kind === "member") return Boolean(row.user_id) && row.user_id === buyer.userId;
  return !row.user_id && Boolean(row.guest_session_id) && row.guest_session_id === buyer.guestSessionId;
}

export type BuyerDecision =
  | { kind: "member" }
  | { kind: "guest" }
  | { error: "AUTH_EXPIRED" | "GUEST_SESSION_INVALID" };

/**
 * A valid login always wins (members are never downgraded). A member whose
 * login is missing or expired gets AUTH_EXPIRED so the page can offer
 * "sign in again" or an explicit guest choice.
 */
export function decideBuyer(input: {
  mode: CheckoutMode;
  bearerValid: boolean;
  guestSessionValid: boolean;
}): BuyerDecision {
  if (input.bearerValid) return { kind: "member" };
  if (input.mode === "member") return { error: "AUTH_EXPIRED" };
  return input.guestSessionValid ? { kind: "guest" } : { error: "GUEST_SESSION_INVALID" };
}

export function ackIsUsable(
  buyer: BuyerIdentity,
  ack: (OwnedRow & { accepted?: boolean | null; order_id?: string | null; accepted_at?: string | null }) | null,
  now = Date.now(),
): boolean {
  if (!ack || ack.accepted !== true || ack.order_id) return false;
  if (!ownsRow(buyer, ack)) return false;
  const at = ack.accepted_at ? new Date(ack.accepted_at).getTime() : NaN;
  return Number.isFinite(at) && now - at <= ACK_MAX_AGE_MS;
}

export const normalizeEmail = (e: unknown) => String(e ?? "").trim().toLowerCase();

export const CHECKOUT_ERRORS = {
  AUTH_EXPIRED: "AUTH_EXPIRED: Your login has expired. Sign in again, or continue as a guest.",
  GUEST_SESSION_INVALID: "GUEST_SESSION_INVALID: Your guest checkout session has expired. Please choose Continue as guest again.",
  ACK_REQUIRED: "ACK_REQUIRED: Please confirm the Research Use Acknowledgement again before continuing.",
} as const;

export function checkoutErrorCode(error: unknown): keyof typeof CHECKOUT_ERRORS | null {
  const m = String((error as any)?.message ?? error ?? "");
  for (const k of Object.keys(CHECKOUT_ERRORS) as (keyof typeof CHECKOUT_ERRORS)[]) if (m.startsWith(k)) return k;
  return null;
}

export function checkoutErrorText(error: unknown, fallback: string) {
  const m = String((error as any)?.message ?? "");
  const code = checkoutErrorCode(error);
  if (code) return m.slice(code.length + 1).trim();
  return m || fallback;
}
