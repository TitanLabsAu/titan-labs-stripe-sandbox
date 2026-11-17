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
  const origin = new URL(order.returnOrigin);
  if (
    origin.protocol !== "https:" ||
    origin.href !== origin.origin + "/" ||
    ["titanlabsaus.com", "www.titanlabsaus.com"].includes(origin.hostname)
  ) {
    throw new Error("Configure a separate HTTPS origin for the Stripe sandbox checkout.");
  }

  if (!Number.isSafeInteger(order.amountCents) || order.amountCents <= 0) {
    throw new Error("The Stripe order total must be a positive number of cents.");
  }

  const metadata = {
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
    success_url: origin.origin + "/checkout?stripe_session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin.origin + "/checkout?stripe_checkout_cancelled=1",
  }, { idempotencyKey: "hosted-sandbox:" + order.attemptId });

  return session;
}

export function createSandboxStripeClient(StripeClient: typeof Stripe, secretKey: string) {
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Hosted sandbox checkout requires a Stripe test secret key.");
  }
  return new StripeClient(secretKey);
}
