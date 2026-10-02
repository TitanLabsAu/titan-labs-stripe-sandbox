import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import {
  ackIsUsable,
  CHECKOUT_ERRORS,
  decideBuyer,
  GUEST_COOKIE,
  GUEST_TTL_SECONDS,
  hashGuestToken,
  isWellFormedGuestToken,
  newGuestToken,
  normalizeEmail,
  type BuyerIdentity,
  type CheckoutMode,
} from "@/lib/guest-capability";

export type ResolvedBuyer = BuyerIdentity & {
  email: string | null;
  emailVerified: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function memberFromBearer(): Promise<{ userId: string; email: string | null; verified: boolean } | null> {
  const header = getRequest()?.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  if (token.split(".").length !== 3) return null;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    verified: Boolean(data.user.email_confirmed_at),
  };
}

async function guestSessionFromCookie(): Promise<string | null> {
  const token = getCookie(GUEST_COOKIE);
  if (!isWellFormedGuestToken(token)) return null;
  const hash = await hashGuestToken(token);
  const db = await admin();
  const { data } = await db
    .from("guest_checkout_sessions")
    .select("id, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() <= Date.now()) return null;
  return String(data.id);
}

/** Server-side identity for checkout. Posted ids/emails are never trusted. */
export async function resolveBuyer(mode: CheckoutMode): Promise<ResolvedBuyer> {
  const member = await memberFromBearer();
  const guestId = member ? null : mode === "guest" ? await guestSessionFromCookie() : null;
  const decision = decideBuyer({ mode, bearerValid: Boolean(member), guestSessionValid: Boolean(guestId) });
  if ("error" in decision) throw new Error(CHECKOUT_ERRORS[decision.error]);
  if (decision.kind === "member" && member) {
    return { kind: "member", userId: member.userId, guestSessionId: null, email: member.email, emailVerified: member.verified };
  }
  return { kind: "guest", userId: null, guestSessionId: guestId!, email: null, emailVerified: false };
}

/** Creates (or keeps) a short-lived guest capability in an httpOnly cookie. */
export async function startGuestSession(): Promise<void> {
  if (await guestSessionFromCookie()) return;
  const token = newGuestToken();
  const db = await admin();
  const { error } = await db.from("guest_checkout_sessions").insert({
    token_hash: await hashGuestToken(token),
    expires_at: new Date(Date.now() + GUEST_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) throw new Error("We couldn't start a guest checkout. Please try again.");
  setCookie(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: true,
    // "none" + Partitioned (CHIPS) so the capability also works when the shop is
    // framed cross-site (e.g. the editor preview); Lax cookies are dropped there,
    // which made the next quote report GUEST_SESSION_INVALID and reset the choice.
    // Server fns are POST/custom-header RPCs, and the cookie is httpOnly + Secure.
    sameSite: "none",
    partitioned: true,
    path: "/",
    maxAge: GUEST_TTL_SECONDS,
  });
}

export function ownerColumns(buyer: BuyerIdentity) {
  return { user_id: buyer.userId, guest_session_id: buyer.guestSessionId };
}

/** The acknowledgement must belong to this buyer, be unused and recent. */
export async function requireAcknowledgement(buyer: BuyerIdentity, ackId: unknown) {
  const id = String(ackId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(CHECKOUT_ERRORS.ACK_REQUIRED);
  const db = await admin();
  const { data } = await db
    .from("order_acknowledgements")
    .select("id, user_id, guest_session_id, order_id, accepted, accepted_at")
    .eq("id", id)
    .maybeSingle();
  if (!ackIsUsable(buyer, data)) throw new Error(CHECKOUT_ERRORS.ACK_REQUIRED);
  return id;
}

export function buyerEmails(buyer: ResolvedBuyer, contactEmail: string) {
  return [...new Set([normalizeEmail(buyer.email), normalizeEmail(contactEmail)].filter(Boolean))];
}
