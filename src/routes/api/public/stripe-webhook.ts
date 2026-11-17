import { createFileRoute } from "@tanstack/react-router";

/*
 * Stripe webhook endpoint.
 *
 * Safety net for asynchronous / redirect payment methods (Zip, Klarna, cards
 * completing after the customer closes the tab). The browser return handler in
 * /checkout remains untouched; whichever path arrives first finalises the
 * order, and the atomic finalize_stripe_order RPC keeps them idempotent.
 */

type PreparedPayload = {
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
  shippingMethod: string;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
    stackPercent: number;
  };
  lines: unknown[];
};

const ok = (body: Record<string, unknown>) =>
  Response.json({ received: true, ...body });

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretKey = process.env["STRIPE_SECRET_KEY"];
        const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

        if (!secretKey || !webhookSecret) {
          console.error("[stripe-webhook] missing Stripe configuration");
          return Response.json(
            { error: "Webhook is not configured" },
            { status: 500 },
          );
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return Response.json(
            { error: "Missing signature" },
            { status: 400 },
          );
        }

        // Raw body, exactly as sent — required for signature verification.
        const rawBody = await request.text();

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(secretKey);

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret,
          );
        } catch (error) {
          console.error(
            "[stripe-webhook] signature verification failed",
            (error as Error)?.message,
          );
          return Response.json(
            { error: "Invalid signature" },
            { status: 400 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        let paymentIntent: import("stripe").Stripe.PaymentIntent;
        let paymentEvent: string = event.type;

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
          if (!secretKey.startsWith("sk_test_") || event.livemode) return ok({ ignored: event.type });
          const session = event.data.object;
          const id = session.metadata?.["payment_attempt_id"];
          if (!id) return ok({ ignored: event.type });
          const { data: hostedAttempt, error } = await db.from("payment_attempts")
            .select("*").eq("provider", "stripe").eq("id", id).maybeSingle();
          if (error) return Response.json({ error: "Lookup failed" }, { status: 500 });
          if (!hostedAttempt) return ok({ unmatched: true });
          if (event.type === "checkout.session.expired") {
            if (session.status !== "expired" || hostedAttempt.transaction_id !== session.id || hostedAttempt.order_id) {
              return ok({ ignored: event.type });
            }
            const { error: cancelError } = await db.from("payment_attempts")
              .update({ status: "cancelled", error_code: "STRIPE_CHECKOUT_EXPIRED" })
              .eq("id", id).eq("transaction_id", session.id).is("order_id", null);
            if (cancelError) return Response.json({ error: "Could not expire payment" }, { status: 500 });
            for (const rpc of ["release_store_credit_for_attempt", "release_first_offer_for_attempt", "release_referral_redemption_for_attempt"]) {
              const { error: releaseError } = await db.rpc(rpc, { _payment_attempt_id: id });
              if (releaseError) return Response.json({ error: "Could not release payment reservation" }, { status: 500 });
            }
            return ok({ status: "cancelled" });
          }
          try {
            const { bindPaidSandboxSession } = await import("@/lib/hosted-stripe-sandbox");
            const intentId = await bindPaidSandboxSession(db, session, hostedAttempt);
            paymentIntent = await stripe.paymentIntents.retrieve(intentId);
            if (paymentIntent.status !== "succeeded") {
              return Response.json({ error: "Payment is not yet confirmed" }, { status: 503 });
            }
          } catch (error) {
            console.error("[stripe-webhook] hosted payment link failed", error);
            return Response.json({ error: "Could not link hosted payment" }, { status: 500 });
          }
          paymentEvent = "payment_intent.succeeded";
        } else {
          if (event.type !== "payment_intent.succeeded" &&
              event.type !== "payment_intent.payment_failed" &&
              event.type !== "payment_intent.canceled") {
            return ok({ ignored: event.type });
          }
          paymentIntent = event.data.object;
          if (paymentIntent.metadata["hosted_sandbox"] === "true") return ok({ ignored: event.type });
        }

        const { data: attempt, error: attemptError } = await (
          supabaseAdmin as any
        )
          .from("payment_attempts")
          .select("*")
          .eq("provider", "stripe")
          .eq("transaction_id", paymentIntent.id)
          .maybeSingle();

        if (attemptError) {
          console.error(
            "[stripe-webhook] attempt lookup failed",
            attemptError,
          );
          // 500 so Stripe retries this delivery.
          return Response.json(
            { error: "Lookup failed" },
            { status: 500 },
          );
        }

        if (!attempt) {
          console.warn(
            "[stripe-webhook] no payment attempt for",
            paymentIntent.id,
          );
          return ok({ unmatched: true });
        }

        // Already finalised: never touch the order or the attempt again.
        if (attempt.order_id) {
          return ok({ alreadyProcessed: true });
        }

        if (paymentEvent === "payment_intent.payment_failed") {
          await (supabaseAdmin as any)
            .from("payment_attempts")
            .update({
              status: "failed",
              error_code:
                paymentIntent.last_payment_error?.code ??
                "STRIPE_PAYMENT_FAILED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", attempt.id)
            .is("order_id", null);
          await (supabaseAdmin as any).rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
          // First-offer claim stays held: a failed intent can still be retried and paid.

          return ok({ status: "failed" });
        }

        if (paymentEvent === "payment_intent.canceled") {
          await (supabaseAdmin as any)
            .from("payment_attempts")
            .update({
              status: "cancelled",
              error_code:
                paymentIntent.cancellation_reason ??
                "STRIPE_PAYMENT_CANCELED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", attempt.id)
            .is("order_id", null);
          await (supabaseAdmin as any).rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
          await (supabaseAdmin as any).rpc("release_first_offer_for_attempt", { _payment_attempt_id: attempt.id });
          await (supabaseAdmin as any).rpc("release_referral_redemption_for_attempt", { _payment_attempt_id: attempt.id });

          return ok({ status: "cancelled" });
        }

        /* payment_intent.succeeded — validate before finalising. */
        const amountMatches =
          Number(paymentIntent.amount) === Number(attempt.amount_cents);
        const currencyMatches =
          String(paymentIntent.currency).toLowerCase() === "aud";
        const metadataMatches =
          String(paymentIntent.metadata?.["payment_attempt_id"] ?? "") ===
            String(attempt.id) &&
          String(paymentIntent.metadata?.["user_id"] ?? "") ===
            String(attempt.user_id ?? "") &&
          String(paymentIntent.metadata?.["guest_session_id"] ?? "") ===
            String(attempt.guest_session_id ?? "");

        if (!amountMatches || !currencyMatches || !metadataMatches) {
          const failure = !amountMatches
            ? "AMOUNT_MISMATCH"
            : !currencyMatches
              ? "CURRENCY_MISMATCH"
              : "METADATA_MISMATCH";

          console.error("[stripe-webhook] validation failed", {
            paymentIntent: paymentIntent.id,
            failure,
          });

          await (supabaseAdmin as any)
            .from("payment_attempts")
            .update({
              status: "failed",
              error_code: failure,
              updated_at: new Date().toISOString(),
            })
            .eq("id", attempt.id)
            .is("order_id", null);
          await (supabaseAdmin as any).rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
          await (supabaseAdmin as any).rpc("release_first_offer_for_attempt", { _payment_attempt_id: attempt.id });
          await (supabaseAdmin as any).rpc("release_referral_redemption_for_attempt", { _payment_attempt_id: attempt.id });

          return ok({ status: "rejected", reason: failure });
        }

        const payload = attempt.order_payload as PreparedPayload;

        const { finalizeArgs } = await import("@/lib/stripe-finalize");
        const { data: result, error: rpcError } = await (supabaseAdmin as any).rpc(
          "finalize_checkout_order",
          finalizeArgs(paymentIntent.id, attempt.id, payload),
        );

        if (rpcError || !result) {
          console.error("[stripe-webhook] finalisation failed", rpcError);
          // 500 so Stripe retries the delivery later.
          return Response.json(
            { error: "Finalisation failed" },
            { status: 500 },
          );
        }

        const { tryOrderConfirmation } = await import("@/lib/order-confirmation.server");
        await tryOrderConfirmation(result.id);

        return ok({
          status: "finalised",
          orderNumber: result.order_number ?? null,
        });
      },
    },
  },
});

