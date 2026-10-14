import { createServerFn } from "@tanstack/react-start";
import type { CheckoutMode } from "@/lib/guest-capability";
import type { ResolvedBuyer } from "@/lib/checkout-buyer.server";
import type { ShippingMethodKey } from "@/lib/pricing";
import type {
  SubmitOrderItem,
  SubmittedOrder,
} from "@/lib/orders.functions";

type StripeCheckoutInput = {
  mode: CheckoutMode;
  acknowledgementId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postcode: string;
  notes?: string;
  shippingMethod?: ShippingMethodKey;
  items: SubmitOrderItem[];
  code?: string | null;
  creditUnits?: number;
  expectedStripeMode?: "test" | "live";
};

type PreparedStripePayload = {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    postcode: string;
    shippingAddress: string;
  };
  notes: string;
  shippingMethod: ShippingMethodKey;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
    stackPercent: number;
  };
  lines: Array<{
    product_slug: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    variant_label: string;
  }>;
  pricing?: Record<string, any>;
};

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

async function prepareStripeOrder(
  data: StripeCheckoutInput,
  buyer: ResolvedBuyer,
): Promise<{ payload: PreparedStripePayload; creditUnits: number; firstOffer: any; emails: string[] }> {
  const firstName = clean(data.firstName, 80);
  const lastName = clean(data.lastName, 80);
  const email = clean(data.email, 160);
  const phone = clean(data.phone, 30);
  const addressLine = clean(data.addressLine, 200);
  const city = clean(data.city, 80);
  const state = clean(data.state, 40);
  const postcode = clean(data.postcode, 12);

  if (!firstName || !lastName || !email || !phone) {
    throw new Error("Please add your name, email and contact number.");
  }
  if (!addressLine || !city || !state || !postcode) {
    throw new Error("Please complete your delivery address.");
  }

  const shippingMethod: ShippingMethodKey =
    data.shippingMethod === "standard" ? "standard" : "express";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { priceCheckout, pricingNote, pricingSnapshot, discountDollars } = await import(
    "@/lib/checkout-pricing.server"
  );
  const { buyerEmails } = await import("@/lib/checkout-buyer.server");
  const emails = buyerEmails(buyer, email);
  const priced = await priceCheckout(supabaseAdmin, { userId: buyer.userId, emails, emailVerified: buyer.emailVerified }, {
    items: data.items,
    shippingMethod,
    paymentMethod: "card",
    code: data.code ?? null,
    creditUnits: data.creditUnits ?? 0,
  });
  if (data.code && priced.codeError) throw new Error(priced.codeError);
  const q = priced.quote;

  const shippingAddress = [addressLine, city, `${state} ${postcode}`.trim()]
    .filter(Boolean)
    .join(", ");
  const shippingNote = `Shipping: ${
    shippingMethod === "standard" ? "Standard tracked (3-7 days)" : "Express + insurance (1-4 days)"
  }`;
  const notes = [clean(data.notes, 500), shippingNote, pricingNote(q)].filter(Boolean).join("\n");

  const snapshot = pricingSnapshot(priced, null);
  return {
    emails,
    firstOffer: snapshot.first_purchase_offer,
    creditUnits: buyer.userId ? q.creditUnits : 0,
    payload: {
      customer: { firstName, lastName, email, phone, addressLine, city, state, postcode, shippingAddress },
      notes,
      shippingMethod,
      totals: {
        subtotal: q.itemsCents / 100,
        discount: discountDollars(q),
        shipping: q.shippingCents / 100,
        total: q.totalCents / 100,
        stackPercent: q.multibuyPercent,
      },
      lines: priced.lines,
      pricing: snapshot,
    },
  };
}

export const createStripeSandboxPayment = createServerFn({
  method: "POST",
})
  .inputValidator((input: StripeCheckoutInput) => input)
  .handler(async ({ data }) => {
    const secretKey = process.env["STRIPE_SECRET_KEY"];

    if (!secretKey) {
      throw new Error(
        "Stripe sandbox credentials are not configured.",
      );
    }

    // Refuse to create a payment when the browser key and secret key are in different modes.
    const { resolveStripePublicConfig } = await import("@/lib/stripe-config");
    const keyCheck = resolveStripePublicConfig({
      runtimeKey: process.env["STRIPE_PUBLISHABLE_KEY"],
      buildKey: import.meta.env["VITE_STRIPE_PUBLISHABLE_KEY"] as string | undefined,
      secretKey,
    });
    if (!keyCheck.ok) {
      throw new Error("Secure card payments are temporarily unavailable. Please choose another payment method.");
    }
    if (data.expectedStripeMode && data.expectedStripeMode !== keyCheck.mode) {
      throw new Error("Card payment settings were just updated. Please refresh the page and try again.");
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secretKey);

    const { resolveBuyer, requireAcknowledgement, ownerColumns } = await import("@/lib/checkout-buyer.server");
    const buyer = await resolveBuyer(data.mode === "guest" ? "guest" : "member");
    const acknowledgementId = await requireAcknowledgement(buyer, data.acknowledgementId);
    const { payload, creditUnits, firstOffer, emails } = await prepareStripeOrder(data, buyer);

    const amountCents = Math.round(
      payload.totals.total * 100,
    );

    if (amountCents <= 0) {
      throw new Error(
        "This order total is $0 — please submit it using the PayID option instead.",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // First-purchase offer: atomic one-time claim, held while the intent is payable.
    let claimId: string | null = null;
    if (firstOffer && buyer.userId) {
      const { claimFirstOffer } = await import("@/lib/checkout-pricing.server");
      claimId = await claimFirstOffer(supabaseAdmin, buyer.userId, emails, 60);
    }
    const releaseClaim = async () => {
      if (claimId) await (supabaseAdmin as any).rpc("release_first_offer", { _claim_id: claimId });
    };

    // Reserve store credit atomically before the attempt exists.
    let reservationId: string | null = null;
    if (creditUnits > 0 && buyer.userId) {
      const { data: rid, error: reserveError } = await (supabaseAdmin as any).rpc(
        "reserve_store_credit",
        { _user_id: buyer.userId, _units: creditUnits, _payment_attempt_id: null, _ttl_minutes: 2880 },
      );
      if (reserveError) await releaseClaim();
      if (reserveError) throw new Error("Your store credit balance changed. Please review your order.");
      reservationId = String(rid);
      payload.pricing = { ...(payload.pricing ?? {}), credit_reservation_id: reservationId };
    }

    const { data: attempt, error: attemptError } =
      await (supabaseAdmin as any)
        .from("payment_attempts")
        .insert({
          ...ownerColumns(buyer),
          acknowledgement_id: acknowledgementId,
          first_purchase_offer: firstOffer,
          first_offer_claim_id: claimId,
          provider: "stripe",
          amount_cents: amountCents,
          currency: "AUD",
          status: "created",
          order_payload: payload,
        })
        .select("id")
        .single();

    if (attemptError) {
      if (reservationId) await (supabaseAdmin as any).rpc("release_store_credit", { _reservation_id: reservationId });
      await releaseClaim();
      throw attemptError;
    }
    if (claimId) {
      await (supabaseAdmin as any).rpc("attach_first_offer_claim", {
        _claim_id: claimId,
        _payment_attempt_id: attempt.id,
      });
    }
    if (reservationId) {
      await (supabaseAdmin as any).rpc("attach_store_credit_reservation", {
        _reservation_id: reservationId,
        _payment_attempt_id: attempt.id,
      });
    }

    let createdIntentId: string | null = null;
    try {
      const paymentIntent =
        await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "aud",

          automatic_payment_methods: {
            enabled: true,
          },

          receipt_email: payload.customer.email,

          metadata: {
            payment_attempt_id: String(attempt.id),
            user_id: String(buyer.userId ?? ""),
            guest_session_id: String(buyer.guestSessionId ?? ""),
          },

          description: "Titan Labs order",
        });

      createdIntentId = paymentIntent.id;
      if (!paymentIntent.client_secret) {
        throw new Error(
          "Stripe did not return a client secret.",
        );
      }

      const { error: updateError } =
        await (supabaseAdmin as any)
          .from("payment_attempts")
          .update({
            status: "ready",
            transaction_id: paymentIntent.id,
          })
          .eq("id", attempt.id);

      if (updateError) {
        throw updateError;
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        attemptId: String(attempt.id),
        amountCents,
        publishableKey: keyCheck.publishableKey,
        stripeMode: keyCheck.mode,
      };
       } catch (error) {
      // An intent may exist even if saving its id failed. Cancel it before releasing rewards.
      const { cancelUnboundIntent } = await import("@/lib/stripe-recovery");
      const safeToRelease = await cancelUnboundIntent(stripe, createdIntentId);
      if (safeToRelease) {
        await (supabaseAdmin as any).rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
        await (supabaseAdmin as any).rpc("release_first_offer_for_attempt", { _payment_attempt_id: attempt.id });
      }
      await (supabaseAdmin as any)
        .from("payment_attempts")
        .update({
          status: safeToRelease ? "failed" : "ready",
          ...(createdIntentId ? { transaction_id: createdIntentId } : {}),
        })
        .eq("id", attempt.id);

      throw error;
    }
  });

export const verifyStripeSandboxPayment = createServerFn({
  method: "POST",
})
  .inputValidator(
    (input: { paymentIntentId: string; mode: CheckoutMode }) => input,
  )
  .handler(
    async ({ data }): Promise<SubmittedOrder> => {
      const { resolveBuyer } = await import("@/lib/checkout-buyer.server");
      const { ownsRow } = await import("@/lib/guest-capability");
      const buyer = await resolveBuyer(data.mode === "guest" ? "guest" : "member");
      const paymentIntentId = clean(
        data.paymentIntentId,
        255,
      );

      if (!paymentIntentId) {
        throw new Error(
          "Missing Stripe PaymentIntent ID.",
        );
      }

      const secretKey = process.env["STRIPE_SECRET_KEY"];

      if (!secretKey) {
        throw new Error(
          "Stripe sandbox credentials are not configured.",
        );
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(secretKey);

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const { data: attempt, error: attemptError } =
        await (supabaseAdmin as any)
          .from("payment_attempts")
          .select("*")
          .eq("provider", "stripe")
          .eq("transaction_id", paymentIntentId)
          .maybeSingle();

      if (attemptError) {
        console.error("Stripe attempt lookup failed", attemptError);
        throw new Error(
          "We could not look up this payment. Please try again.",
        );
      }

      if (!attempt) {
        console.error("No Stripe attempt for PaymentIntent", paymentIntentId);
        throw new Error(
          "We couldn't find this payment. If you were charged, please contact us with your payment reference.",
        );
      }

      if (!ownsRow(buyer, attempt)) {
        console.error("Stripe attempt owner mismatch", { paymentIntentId, buyer: buyer.kind });
        throw new Error(
          attempt.user_id
            ? "This payment was started from a different account. Please log in with the account you used at checkout."
            : "This payment was started in a different guest checkout session.",
        );
      }

      const payload =
        attempt.order_payload as PreparedStripePayload;

      /*
       * Idempotency protection:
       * if this payment already created an order,
       * return that existing order instead of
       * creating another one.
       */
      if (attempt.order_id) {
        const { data: existing, error } =
          await (supabaseAdmin as any)
            .from("orders")
            .select(
              "id, order_number, subtotal, shipping, total, payment_method",
            )
            .eq("id", attempt.order_id)
            .single();

        if (error) {
          throw error;
        }

        return {
          id: existing.id,
          orderNumber: Number(existing.order_number),
          reference: `TL-${existing.order_number}`,
          subtotal: payload.totals.subtotal,
          discount: payload.totals.discount,
          shipping: payload.totals.shipping,
          total: payload.totals.total,
          paymentMethod: "card",
          shippingMethod: payload.shippingMethod,
          guest: !attempt.user_id,
        };
      }


      /*
       * Retrieve the PaymentIntent directly from
       * Stripe. We do not trust the browser to tell
       * us whether payment succeeded.
       */
      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          paymentIntentId,
        );

      const amountMatches =
        Number(paymentIntent.amount) ===
        Number(attempt.amount_cents);

      const currencyMatches =
        String(paymentIntent.currency).toLowerCase() ===
        "aud";

      const metadataMatches =
        String(
          paymentIntent.metadata?.["payment_attempt_id"] ?? "",
        ) === String(attempt.id) &&
        String(paymentIntent.metadata?.["user_id"] ?? "") ===
          String(attempt.user_id ?? "") &&
        String(paymentIntent.metadata?.["guest_session_id"] ?? "") ===
          String(attempt.guest_session_id ?? "");

      if (
        paymentIntent.status !== "succeeded" ||
        !amountMatches ||
        !currencyMatches ||
        !metadataMatches
      ) {
        const failure =
          !amountMatches
            ? "AMOUNT_MISMATCH"
            : !currencyMatches
              ? "CURRENCY_MISMATCH"
              : !metadataMatches
                ? "METADATA_MISMATCH"
                : `STRIPE_${paymentIntent.status.toUpperCase()}`;

        await (supabaseAdmin as any)
          .from("payment_attempts")
          .update({
            status: "failed",
            error_code: failure,
          })
          .eq("id", attempt.id);

        // Only release credit when Stripe says this payment can no longer succeed.
        if (
          !amountMatches || !currencyMatches || !metadataMatches ||
          paymentIntent.status === "canceled" || paymentIntent.status === "requires_payment_method"
        ) {
          await (supabaseAdmin as any).rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
        }
        // The first-offer claim is only released when the intent can never be paid.
        if (!amountMatches || !currencyMatches || !metadataMatches || paymentIntent.status === "canceled") {
          await (supabaseAdmin as any).rpc("release_first_offer_for_attempt", { _payment_attempt_id: attempt.id });
        }


        throw new Error(
          paymentIntent.status === "succeeded"
            ? "The Stripe payment could not be verified."
            : "The card payment has not been completed.",
        );
      }

      /*
       * Atomic order finalisation: order, order_items,
       * profile and payment_attempt are written inside
       * one PostgreSQL transaction, keyed on the
       * PaymentIntent id, and roll back together.
       */
      const { finalizeArgs } = await import("@/lib/stripe-finalize");
      const { data: result, error: rpcError } = await (supabaseAdmin as any).rpc(
        "finalize_checkout_order",
        finalizeArgs(paymentIntent.id, attempt.id, payload),
      );

      if (rpcError || !result) {
        throw (
          rpcError ??
          new Error("The order could not be finalised.")
        );
      }

      const { tryOrderConfirmation } = await import("@/lib/order-confirmation.server");
      await tryOrderConfirmation(result.id);

      return {
        id: result.id,
        orderNumber: Number(result.order_number),
        reference: `TL-${result.order_number}`,
        subtotal: payload.totals.subtotal,
        discount: payload.totals.discount,
        shipping: payload.totals.shipping,
        total: payload.totals.total,
        paymentMethod: "card",
        shippingMethod: payload.shippingMethod,
        guest: !attempt.user_id,
      };

    },
  );


/**
 * Customer abandons the card step: cancel the PaymentIntent at Stripe first, so
 * it can never be paid later, and only then release held credit and offer.
 */
export const cancelStripeCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { paymentIntentId: string; mode: CheckoutMode }) => input)
  .handler(async ({ data }) => {
    const paymentIntentId = clean(data.paymentIntentId, 255);
    if (!paymentIntentId) return { ok: false };
    const secretKey = process.env["STRIPE_SECRET_KEY"];
    if (!secretKey) throw new Error("Stripe sandbox credentials are not configured.");
    const { resolveBuyer } = await import("@/lib/checkout-buyer.server");
    const { ownsRow } = await import("@/lib/guest-capability");
    const buyer = await resolveBuyer(data.mode === "guest" ? "guest" : "member");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: attempt } = await db
      .from("payment_attempts")
      .select("id, user_id, guest_session_id, order_id")
      .eq("provider", "stripe")
      .eq("transaction_id", paymentIntentId)
      .maybeSingle();
    if (!ownsRow(buyer, attempt) || attempt.order_id) return { ok: false };
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secretKey);
    let canceled = false;
    try {
      const pi = await stripe.paymentIntents.cancel(paymentIntentId);
      canceled = pi.status === "canceled";
    } catch (error) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      canceled = pi.status === "canceled";
      if (!canceled) console.warn("Stripe cancel refused", pi.status, (error as Error)?.message);
    }
    if (!canceled) return { ok: false };
    await db.from("payment_attempts").update({ status: "cancelled", error_code: "CUSTOMER_CANCELLED" }).eq("id", attempt.id).is("order_id", null);
    await db.rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
    await db.rpc("release_first_offer_for_attempt", { _payment_attempt_id: attempt.id });
    return { ok: true };
  });
