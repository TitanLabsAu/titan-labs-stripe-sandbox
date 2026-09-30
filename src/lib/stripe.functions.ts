import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { kitPriceFor } from "@/lib/products";
import { computeTotals, type ShippingMethodKey } from "@/lib/pricing";
import type { SubmitOrderItem } from "@/lib/orders.functions";

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
