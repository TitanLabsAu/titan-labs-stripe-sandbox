import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { kitPriceFor } from "@/lib/products";
import { computeTotals, type ShippingMethodKey } from "@/lib/pricing";
import type {
  SubmitOrderItem,
  SubmittedOrder,
} from "@/lib/orders.functions";

type StripeCheckoutInput = {
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
};

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

async function prepareStripeOrder(
  data: StripeCheckoutInput,
  supabase: any,
): Promise<PreparedStripePayload> {
  const items = (data.items ?? [])
    .filter((item) => item.slug && item.quantity > 0)
    .slice(0, 50);

  if (items.length === 0) {
    throw new Error("Your order is empty.");
  }

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

  const slugs = [...new Set(items.map((item) => item.slug))];

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("slug, name, price, sale_price, kit_price, product_variants")
    .in("slug", slugs)
    .eq("active", true);

  if (productError) {
    throw productError;
  }

  const bySlug = new Map(
    (products ?? []).map((product: any) => [product.slug, product]),
  );

  let rawSubtotal = 0;
  let units = 0;

  const lines: PreparedStripePayload["lines"] = [];

  for (const item of items) {
    const product: any = bySlug.get(item.slug);

    if (!product) {
      throw new Error("One of the items is no longer available.");
    }

    const variants = Array.isArray(product.product_variants)
      ? product.product_variants
      : [];

    const variant =
      variants.find(
        (value: any) =>
          String(value?.id) === String(item.variantId ?? ""),
      ) ?? null;

    const listPrice = Number(product.price);
    const sale =
      product.sale_price == null ? null : Number(product.sale_price);

    const basePrice =
      sale != null && sale > 0 && sale < listPrice
        ? sale
        : listPrice;

    const singlePrice = variant
      ? Number(variant.price)
      : basePrice;

    const pack = item.pack === "kit" ? "kit" : "single";

    const unitPrice =
      pack === "kit"
        ? kitPriceFor(
            singlePrice,
            variant?.kitPrice ?? product.kit_price,
          )
        : singlePrice;

    const quantity = Math.min(
      99,
      Math.max(1, Math.floor(item.quantity)),
    );

    const label = variant?.label
      ? String(variant.label)
      : "Single vial";

    rawSubtotal += unitPrice * quantity;
    units += quantity;

    lines.push({
      product_slug: product.slug,
      product_name: product.name,
      unit_price: unitPrice,
      quantity,
      variant_label:
        pack === "kit"
          ? `${label} · 10x Kit`
          : label,
    });
  }

  const shippingMethod: ShippingMethodKey =
    data.shippingMethod === "standard"
      ? "standard"
      : "express";

  const totals = computeTotals({
    subtotal: rawSubtotal,
    units,
    shippingMethod,
    paymentMethod: "card",
  });

  const shippingAddress = [
    addressLine,
    city,
    `${state} ${postcode}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const discountNote =
    totals.discountTotal > 0
      ? `Discounts: Titan Stack ${totals.stackPercent}% (−$${totals.discountTotal.toFixed(2)})`
      : "";

  const shippingNote =
    `Shipping: ${
      shippingMethod === "standard"
        ? "Standard tracked (3-7 days)"
        : "Express + insurance (1-4 days)"
    }`;

  const notes = [
    clean(data.notes, 500),
    shippingNote,
    discountNote,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    customer: {
      firstName,
      lastName,
      email,
      phone,
      addressLine,
      city,
      state,
      postcode,
      shippingAddress,
    },
    notes,
    shippingMethod,
    totals: {
      subtotal: totals.subtotal,
      discount: totals.discountTotal,
      shipping: totals.shipping,
      total: totals.total,
      stackPercent: totals.stackPercent,
    },
    lines,
  };
}

export const createStripeSandboxPayment = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: StripeCheckoutInput) => input)
  .handler(async ({ data, context }) => {
    const secretKey = process.env["STRIPE_SECRET_KEY"];

    if (!secretKey) {
      throw new Error(
        "Stripe sandbox credentials are not configured.",
      );
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secretKey);

    const payload = await prepareStripeOrder(
      data,
      context.supabase,
    );

    const amountCents = Math.round(
      payload.totals.total * 100,
    );

    if (amountCents <= 0) {
      throw new Error(
        "The order total must be greater than zero.",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: attempt, error: attemptError } =
      await (supabaseAdmin as any)
        .from("payment_attempts")
        .insert({
          user_id: context.userId,
          provider: "stripe",
          amount_cents: amountCents,
          currency: "AUD",
          status: "created",
          order_payload: payload,
        })
        .select("id")
        .single();

    if (attemptError) {
      throw attemptError;
    }

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
            user_id: String(context.userId),
          },

          description: "Titan Labs order",
        });

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
          .eq("id", attempt.id)
          .eq("user_id", context.userId);

      if (updateError) {
        throw updateError;
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        attemptId: String(attempt.id),
        amountCents,
      };
       } catch (error) {
      await (supabaseAdmin as any)
        .from("payment_attempts")
        .update({
          status: "failed",
        })
        .eq("id", attempt.id);

      throw error;
    }
  });

export const verifyStripeSandboxPayment = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { paymentIntentId: string }) => input,
  )
  .handler(
    async ({ data, context }): Promise<SubmittedOrder> => {
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
          .eq("user_id", context.userId)
          .single();

      if (attemptError || !attempt) {
        throw new Error(
          "Stripe payment attempt not found.",
        );
      }

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

        const payload =
          attempt.order_payload as PreparedStripePayload;

        return {
          id: existing.id,
          orderNumber: Number(existing.order_number),
          reference: `TL-${existing.order_number}`,
          subtotal:
            Number(existing.subtotal) +
            Number(payload.totals.discount),
          discount: Number(payload.totals.discount),
          shipping: Number(existing.shipping),
          total: Number(existing.total),
          paymentMethod: "card",
          shippingMethod: payload.shippingMethod,
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
          String(context.userId);

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

        throw new Error(
          paymentIntent.status === "succeeded"
            ? "The Stripe payment could not be verified."
            : "The card payment has not been completed.",
        );
      }

      const payload =
        attempt.order_payload as PreparedStripePayload;

      const { data: order, error: orderError } =
        await (supabaseAdmin as any)
          .from("orders")
          .insert({
            user_id: context.userId,
            status: "processing",

            subtotal:
              payload.totals.total -
              payload.totals.shipping,

            shipping: payload.totals.shipping,
            total: payload.totals.total,

            payment_method: "card",
            payment_reference: paymentIntent.id,
            payment_provider: "stripe",
            payment_transaction_id: paymentIntent.id,

            payment_confirmed: true,
            payment_confirmed_at:
              new Date().toISOString(),

            contact_name:
              `${payload.customer.firstName} ${payload.customer.lastName}`.trim(),

            contact_email: payload.customer.email,
            contact_phone: payload.customer.phone,

            shipping_address:
              payload.customer.shippingAddress,

            notes: payload.notes,
          })
          .select("id, order_number")
          .single();

      if (orderError) {
        throw orderError;
      }

      const { error: itemError } =
        await (supabaseAdmin as any)
          .from("order_items")
          .insert(
            payload.lines.map((line) => ({
              ...line,
              order_id: order.id,
            })),
          );

      if (itemError) {
        throw itemError;
      }

      await (supabaseAdmin as any)
        .from("profiles")
        .update({
          first_name: payload.customer.firstName,
          last_name: payload.customer.lastName,
          phone_number: payload.customer.phone,
          address_line: payload.customer.addressLine,
          city: payload.customer.city,
          state: payload.customer.state,
          postcode: payload.customer.postcode,
          postal_address:
            payload.customer.shippingAddress,
        })
        .eq("id", context.userId);

      await (supabaseAdmin as any)
        .from("payment_attempts")
        .update({
          status: "paid",
          transaction_id: paymentIntent.id,
          order_id: order.id,
        })
        .eq("id", attempt.id);

      return {
        id: order.id,
        orderNumber: Number(order.order_number),
        reference: `TL-${order.order_number}`,
        subtotal: payload.totals.subtotal,
        discount: payload.totals.discount,
        shipping: payload.totals.shipping,
        total: payload.totals.total,
        paymentMethod: "card",
        shippingMethod: payload.shippingMethod,
      };
    },
  );
