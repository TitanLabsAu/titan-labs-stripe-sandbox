import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { kitPriceFor } from "@/lib/products";
import { computeTotals, type ShippingMethodKey } from "@/lib/pricing";
import type { SubmitOrderItem, SubmittedOrder } from "@/lib/orders.functions";

const EWAY_SANDBOX_BASE = "https://api.sandbox.ewaypayments.com";

type CardCheckoutInput = {
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

function ewayAuthHeader() {
  const key = process.env["EWAY_API_KEY"];
  const password = process.env["EWAY_API_PASSWORD"];
  if (!key || !password) throw new Error("Eway sandbox credentials are not configured.");
  return `Basic ${Buffer.from(`${key}:${password}`).toString("base64")}`;
}

async function ewayFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${EWAY_SANDBOX_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: ewayAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-EWAY-APIVERSION": "47",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.Errors || body?.ResponseMessage || `HTTP ${response.status}`;
    throw new Error(`Eway sandbox error: ${code}`);
  }
  return body;
}

async function prepareCardOrder(data: CardCheckoutInput, supabase: any): Promise<PreparedPayload> {
  const items = (data.items ?? []).filter((i) => i.slug && i.quantity > 0).slice(0, 50);
  if (items.length === 0) throw new Error("Your order is empty.");

  const firstName = clean(data.firstName, 80);
  const lastName = clean(data.lastName, 80);
  const email = clean(data.email, 160);
  const phone = clean(data.phone, 30);
  const addressLine = clean(data.addressLine, 200);
  const city = clean(data.city, 80);
  const state = clean(data.state, 40);
  const postcode = clean(data.postcode, 12);
  if (!firstName || !lastName || !email || !phone) throw new Error("Please add your name, email and contact number.");
  if (!addressLine || !city || !state || !postcode) throw new Error("Please complete your delivery address.");

  const slugs = [...new Set(items.map((i) => i.slug))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("slug, name, price, sale_price, kit_price, product_variants")
    .in("slug", slugs)
    .eq("active", true);
  if (productError) throw productError;

  const bySlug = new Map((products ?? []).map((p: any) => [p.slug, p]));
  let rawSubtotal = 0;
  let units = 0;
  const lines: PreparedPayload["lines"] = [];

  for (const item of items) {
    const product: any = bySlug.get(item.slug);
    if (!product) throw new Error("One of the items is no longer available.");
    const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
    const variant = variants.find((v: any) => String(v?.id) === String(item.variantId ?? "")) ?? null;
    const listPrice = Number(product.price);
    const sale = product.sale_price == null ? null : Number(product.sale_price);
    const basePrice = sale != null && sale > 0 && sale < listPrice ? sale : listPrice;
    const singlePrice = variant ? Number(variant.price) : basePrice;
    const pack = item.pack === "kit" ? "kit" : "single";
    const unitPrice = pack === "kit" ? kitPriceFor(singlePrice, variant?.kitPrice ?? product.kit_price) : singlePrice;
    const quantity = Math.min(99, Math.max(1, Math.floor(item.quantity)));
    const label = variant?.label ? String(variant.label) : "Single vial";
    rawSubtotal += unitPrice * quantity;
    units += quantity;
    lines.push({
      product_slug: product.slug,
      product_name: product.name,
      unit_price: unitPrice,
      quantity,
      variant_label: pack === "kit" ? `${label} · 10x Kit` : label,
    });
  }

  const shippingMethod: ShippingMethodKey = data.shippingMethod === "standard" ? "standard" : "express";
  const totals = computeTotals({ subtotal: rawSubtotal, units, shippingMethod, paymentMethod: "card" });
  const shippingAddress = [addressLine, city, `${state} ${postcode}`.trim()].filter(Boolean).join(", ");
  const discountNote = totals.discountTotal > 0 ? `Discounts: Titan Stack ${totals.stackPercent}% (−$${totals.discountTotal.toFixed(2)})` : "";
  const shippingNote = `Shipping: ${shippingMethod === "standard" ? "Standard tracked (3-7 days)" : "Express + insurance (1-4 days)"}`;
  const notes = [clean(data.notes, 500), shippingNote, discountNote].filter(Boolean).join("\n");

  return {
    customer: { firstName, lastName, email, phone, addressLine, city, state, postcode, shippingAddress },
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

export const createEwaySandboxPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CardCheckoutInput) => input)
  .handler(async ({ data, context }) => {
    const payload = await prepareCardOrder(data, context.supabase);
    const amountCents = Math.round(payload.totals.total * 100);
    if (amountCents <= 0) throw new Error("The order total must be greater than zero.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: attempt, error: attemptError } = await (supabaseAdmin as any)
      .from("payment_attempts")
      .insert({ user_id: context.userId, amount_cents: amountCents, order_payload: payload })
      .select("id")
      .single();
    if (attemptError) throw attemptError;

    const request = getRequest();
    if (!request) throw new Error("Unable to determine the checkout URL.");
    const origin = new URL(request.url).origin;
    const returnUrl = `${origin}/checkout?eway=return`;
    const cancelUrl = `${origin}/checkout?eway=cancel`;

    try {
      const eway = await ewayFetch("/AccessCodesShared", {
        method: "POST",
        body: JSON.stringify({
          Customer: {
            FirstName: payload.customer.firstName,
            LastName: payload.customer.lastName,
            Street1: payload.customer.addressLine,
            City: payload.customer.city,
            State: payload.customer.state,
            PostalCode: payload.customer.postcode,
            Country: "au",
            Email: payload.customer.email,
            Phone: payload.customer.phone,
          },
          Payment: {
            TotalAmount: amountCents,
            CurrencyCode: "AUD",
            InvoiceNumber: `TL-SBX-${String(attempt.id).slice(0, 8)}`,
            InvoiceReference: String(attempt.id),
            InvoiceDescription: "Titan Labs order",
          },
          RedirectUrl: returnUrl,
          CancelUrl: cancelUrl,
          Method: "ProcessPayment",
          TransactionType: "Purchase",
          CustomerReadOnly: true,
          HeaderText: "Secure card payment",
        }),
      });

      if (!eway.AccessCode || !eway.SharedPaymentUrl) throw new Error(`Eway did not return a payment URL. ${eway.Errors ?? ""}`.trim());
      const { error: updateError } = await (supabaseAdmin as any)
        .from("payment_attempts")
        .update({ access_code: eway.AccessCode, status: "ready" })
        .eq("id", attempt.id)
        .eq("user_id", context.userId);
      if (updateError) throw updateError;
      return { accessCode: String(eway.AccessCode), sharedPaymentUrl: String(eway.SharedPaymentUrl) };
    } catch (error) {
      await (supabaseAdmin as any).from("payment_attempts").update({ status: "failed" }).eq("id", attempt.id);
      throw error;
    }
  });

export const verifyEwaySandboxPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accessCode: string }) => input)
  .handler(async ({ data, context }): Promise<SubmittedOrder> => {
    const accessCode = clean(data.accessCode, 512);
    if (!accessCode) throw new Error("Missing Eway AccessCode.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: attempt, error: attemptError } = await (supabaseAdmin as any)
      .from("payment_attempts")
      .select("*")
      .eq("access_code", accessCode)
      .eq("user_id", context.userId)
      .single();
    if (attemptError || !attempt) throw new Error("Payment attempt not found.");

    if (attempt.order_id) {
      const { data: existing, error } = await (supabaseAdmin as any)
        .from("orders")
        .select("id, order_number, subtotal, shipping, total, payment_method")
        .eq("id", attempt.order_id)
        .single();
      if (error) throw error;
      const payload = attempt.order_payload as PreparedPayload;
      return {
        id: existing.id,
        orderNumber: Number(existing.order_number),
        reference: `TL-${existing.order_number}`,
        subtotal: Number(existing.subtotal) + Number(payload.totals.discount),
        discount: Number(payload.totals.discount),
        shipping: Number(existing.shipping),
        total: Number(existing.total),
        paymentMethod: "card",
        shippingMethod: payload.shippingMethod,
      };
    }

    const result = await ewayFetch(`/AccessCode/${encodeURIComponent(accessCode)}`, { method: "GET" });
    const transactionId = result.TransactionID ? String(result.TransactionID) : null;
    const amountMatches = Number(result.TotalAmount) === Number(attempt.amount_cents);
    if (result.TransactionStatus !== true || !transactionId || !amountMatches) {
      const failure = !amountMatches ? "AMOUNT_MISMATCH" : String(result.ResponseMessage || result.Errors || "DECLINED");
      await (supabaseAdmin as any).from("payment_attempts").update({ status: "failed", error_code: failure, transaction_id: transactionId }).eq("id", attempt.id);
      throw new Error(amountMatches ? "The card payment was not approved." : "The payment amount could not be verified.");
    }

    const payload = attempt.order_payload as PreparedPayload;
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from("orders")
      .insert({
        user_id: context.userId,
        status: "processing",
        subtotal: payload.totals.total - payload.totals.shipping,
        shipping: payload.totals.shipping,
        total: payload.totals.total,
        payment_method: "card",
        payment_reference: accessCode,
        payment_provider: "eway",
        payment_transaction_id: transactionId,
        payment_confirmed: true,
        payment_confirmed_at: new Date().toISOString(),
        contact_name: `${payload.customer.firstName} ${payload.customer.lastName}`.trim(),
        contact_email: payload.customer.email,
        contact_phone: payload.customer.phone,
        shipping_address: payload.customer.shippingAddress,
        notes: payload.notes,
      })
      .select("id, order_number")
      .single();
    if (orderError) throw orderError;

    const { error: itemError } = await (supabaseAdmin as any)
      .from("order_items")
      .insert(payload.lines.map((line) => ({ ...line, order_id: order.id })));
    if (itemError) throw itemError;

    await (supabaseAdmin as any).from("profiles").update({
      first_name: payload.customer.firstName,
      last_name: payload.customer.lastName,
      phone_number: payload.customer.phone,
      address_line: payload.customer.addressLine,
      city: payload.customer.city,
      state: payload.customer.state,
      postcode: payload.customer.postcode,
      postal_address: payload.customer.shippingAddress,
    }).eq("id", context.userId);

    await (supabaseAdmin as any).from("payment_attempts").update({
      status: "paid",
      transaction_id: transactionId,
      order_id: order.id,
    }).eq("id", attempt.id);

    const { tryOrderConfirmation } = await import("@/lib/order-confirmation.server");
    await tryOrderConfirmation(order.id);

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
  });

