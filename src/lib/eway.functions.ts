import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ShippingMethodKey } from "@/lib/pricing";
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
  code?: string | null;
  creditUnits?: number;
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
  pricing?: Record<string, any>;
};

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function pricingColumns(p: Record<string, any> | undefined, userId: string) {
  if (!p) return {};
  return {
    discount_code_id: p["discount_code_id"] ?? null,
    discount_code: p["discount_code"] ?? null,
    discount_code_kind: p["discount_code_kind"] ?? null,
    code_discount_cents: Number(p["code_discount_cents"]) || 0,
    referrer_user_id: p["referrer_user_id"] && p["referrer_user_id"] !== userId ? p["referrer_user_id"] : null,
    credit_units: Number(p["credit_units"]) || 0,
    credit_cents: Number(p["credit_cents"]) || 0,
    credit_reservation_id: p["credit_reservation_id"] ?? null,
    pricing_snapshot: p,
  };
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

async function prepareCardOrder(data: CardCheckoutInput, userId: string): Promise<{ payload: PreparedPayload; creditUnits: number }> {
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

  const shippingMethod: ShippingMethodKey = data.shippingMethod === "standard" ? "standard" : "express";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { priceCheckout, pricingNote, pricingSnapshot, discountDollars } = await import("@/lib/checkout-pricing.server");
  const priced = await priceCheckout(supabaseAdmin, { userId, emails: [email], emailVerified: false }, {
    items: data.items,
    shippingMethod,
    paymentMethod: "card",
    code: data.code ?? null,
    creditUnits: data.creditUnits ?? 0,
  });
  if (data.code && priced.codeError) throw new Error(priced.codeError);
  const q = priced.quote;
  const shippingAddress = [addressLine, city, `${state} ${postcode}`.trim()].filter(Boolean).join(", ");
  const shippingNote = `Shipping: ${shippingMethod === "standard" ? "Standard tracked (3-7 days)" : "Express + insurance (1-4 days)"}`;
  const notes = [clean(data.notes, 500), shippingNote, pricingNote(q)].filter(Boolean).join("\n");

  return {
    creditUnits: q.creditUnits,
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
      pricing: pricingSnapshot(priced, null),
    },
  };
}

export const createEwaySandboxPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CardCheckoutInput) => input)
  .handler(async ({ data, context }) => {
    const { payload, creditUnits } = await prepareCardOrder(data, context.userId);
    const amountCents = Math.round(payload.totals.total * 100);
    if (amountCents <= 0) throw new Error("This order total is $0 — please submit it using the PayID option instead.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Referral code: atomic one-time claim (first successful purchase only).
    let referralClaimId: string | null = null;
    if (payload.pricing?.["discount_code_kind"] === "referral") {
      const { claimReferralRedemption } = await import("@/lib/checkout-pricing.server");
      referralClaimId = await claimReferralRedemption(
        supabaseAdmin,
        context.userId,
        [payload.customer.email],
        payload.pricing?.["discount_code_id"] ?? null,
        2880,
      );
    }
    const releaseReferral = async () => {
      if (referralClaimId) await (supabaseAdmin as any).rpc("release_referral_redemption", { _claim_id: referralClaimId });
    };
    let reservationId: string | null = null;
    if (creditUnits > 0) {
      const { data: rid, error: reserveError } = await (supabaseAdmin as any).rpc("reserve_store_credit", {
        _user_id: context.userId, _units: creditUnits, _payment_attempt_id: null, _ttl_minutes: 2880,
      });
      if (reserveError) {
        await releaseReferral();
        throw new Error("Your store credit balance changed. Please review your order.");
      }
      reservationId = String(rid);
      payload.pricing = { ...(payload.pricing ?? {}), credit_reservation_id: reservationId };
    }
    const { data: attempt, error: attemptError } = await (supabaseAdmin as any)
      .from("payment_attempts")
      .insert({ user_id: context.userId, amount_cents: amountCents, order_payload: payload, referral_claim_id: referralClaimId })
      .select("id")
      .single();
    if (attemptError) {
      if (reservationId) await (supabaseAdmin as any).rpc("release_store_credit", { _reservation_id: reservationId });
      await releaseReferral();
      throw attemptError;
    }
    if (reservationId) {
      await (supabaseAdmin as any).rpc("attach_store_credit_reservation", { _reservation_id: reservationId, _payment_attempt_id: attempt.id });
    }
    if (referralClaimId) {
      await (supabaseAdmin as any).rpc("attach_referral_redemption_claim", { _claim_id: referralClaimId, _payment_attempt_id: attempt.id });
    }

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
      await (supabaseAdmin as any).rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
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
      await (supabaseAdmin as any).rpc("release_store_credit_for_attempt", { _payment_attempt_id: attempt.id });
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
        ...pricingColumns(payload.pricing, context.userId),
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

