import type Stripe from "stripe";

type SandboxOrder = {
  attemptId: string;
  amountCents: number;
  returnOrigin: string;
  email: string;
  userId: string | null;
  guestSessionId: string | null;
};

export async function createHostedSandboxSession(stripe: Stripe, order: SandboxOrder) {
  const origin = sandboxReturnOrigin(order.returnOrigin);

  if (!Number.isSafeInteger(order.amountCents) || order.amountCents <= 0) {
    throw new Error("The Stripe order total must be a positive number of cents.");
  }

  const metadata = {
    hosted_sandbox: "true",
    payment_attempt_id: order.attemptId,
    user_id: order.userId ?? "",
    guest_session_id: order.guestSessionId ?? "",
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: order.attemptId,
    customer_email: order.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: order.amountCents,
        product_data: { name: "Titan Labs order (sandbox test)" },
      },
    }],
    metadata,
    payment_intent_data: { metadata, description: "Titan Labs order (sandbox test)" },
    success_url: origin + "/checkout?stripe_session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin + "/checkout?stripe_cancel_attempt=" + encodeURIComponent(order.attemptId),
  }, { idempotencyKey: "hosted-sandbox:" + order.attemptId });

  return session;
}

export function createSandboxStripeClient(StripeClient: typeof Stripe, secretKey: string) {
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Hosted sandbox checkout requires a Stripe test secret key.");
  }
  return new StripeClient(secretKey);
}

type SavedSandboxAttempt = {
  id: string;
  transaction_id: string;
  amount_cents: number;
  user_id: string | null;
  guest_session_id: string | null;
};

export function paidSandboxIntentId(
  session: Stripe.Checkout.Session,
  attempt: SavedSandboxAttempt,
): string | null {
  if (
    session.id !== attempt.transaction_id ||
    session.livemode !== false ||
    session.mode !== "payment" ||
    session.status !== "complete" ||
    session.payment_status !== "paid" ||
    session.currency !== "aud" ||
    session.amount_total !== attempt.amount_cents ||
    session.client_reference_id !== attempt.id ||
    session.metadata?.["payment_attempt_id"] !== attempt.id ||
    session.metadata["user_id"] !== (attempt.user_id ?? "") ||
    session.metadata["guest_session_id"] !== (attempt.guest_session_id ?? "")
  ) {
    return null;
  }

  const intent = session.payment_intent;
  const id = typeof intent === "string" ? intent : intent?.id;
  return id?.startsWith("pi_") ? id : null;
}

export function sandboxReturnOrigin(value: string) {
  const origin = new URL(value);
  if (
    origin.protocol !== "https:" ||
    origin.href !== origin.origin + "/" ||
    ["titanlabsaus.com", "www.titanlabsaus.com"].includes(origin.hostname)
  ) {
    throw new Error("Configure a separate HTTPS origin for the Stripe sandbox checkout.");
  }

  return origin.origin;
}

export async function expireHostedSandboxSession(stripe: Stripe, sessionId: string) {
  try {
    return (await stripe.checkout.sessions.expire(sessionId)).status === "expired";
  } catch {
    return (await stripe.checkout.sessions.retrieve(sessionId)).status === "expired";
  }
}

export async function bindPaidSandboxSession(
  db: any,
  session: Stripe.Checkout.Session,
  attempt: SavedSandboxAttempt,
) {
  const intentId = paidSandboxIntentId(session, { ...attempt, transaction_id: session.id });
  if (!intentId) throw new Error("The sandbox payment could not be verified.");
  if (attempt.transaction_id === intentId) return intentId;
  if (attempt.transaction_id !== session.id) throw new Error("Stripe session does not match the saved attempt.");

  const { data, error } = await db.from("payment_attempts")
    .update({ transaction_id: intentId })
    .eq("id", attempt.id)
    .eq("transaction_id", session.id)
    .select("transaction_id").maybeSingle();
  if (error) throw error;
  if (data?.transaction_id === intentId) return intentId;

  const current = await db.from("payment_attempts").select("transaction_id").eq("id", attempt.id).single();
  if (current.error) throw current.error;
  if (current.data?.transaction_id !== intentId) throw new Error("Stripe payment could not be linked to the attempt.");
  return intentId;
}
