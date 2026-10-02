import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ShippingMethodKey } from "@/lib/pricing";

export type SubmitOrderItem = {
  slug: string;
  variantId?: string | null;
  pack?: "single" | "kit";
  quantity: number;
};

export type SubmitOrderInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postcode: string;
  notes?: string;
  paymentMethod: "payid" | "crypto";
  shippingMethod?: ShippingMethodKey;
  items: SubmitOrderItem[];
  code?: string | null;
  creditUnits?: number;
};

export type SubmittedOrder = {
  id: string;
  orderNumber: number;
  reference: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: "payid" | "crypto" | "card";
  shippingMethod: ShippingMethodKey;
};

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

export const submitOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SubmitOrderInput) => input)
  .handler(async ({ data, context }): Promise<SubmittedOrder> => {
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

    if (!firstName || !lastName || !email || !phone) {
      throw new Error("Please add your name, email and contact number.");
    }
    if (!addressLine || !city || !state || !postcode) {
      throw new Error("Please complete your delivery address.");
    }

    const paymentMethod = data.paymentMethod === "crypto" ? "crypto" : "payid";
    const shippingMethod: ShippingMethodKey =
      data.shippingMethod === "standard" ? "standard" : "express";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { priceCheckout, pricingNote, pricingSnapshot, discountDollars } = await import(
      "@/lib/checkout-pricing.server"
    );
    const priced = await priceCheckout(supabaseAdmin, context.userId, {
      items,
      shippingMethod,
      paymentMethod,
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

    let reservationId: string | null = null;
    if (q.creditUnits > 0) {
      const { data: rid, error: reserveError } = await (supabaseAdmin as any).rpc("reserve_store_credit", {
        _user_id: context.userId, _units: q.creditUnits, _payment_attempt_id: null, _ttl_minutes: 30,
      });
      if (reserveError) throw new Error("Your store credit balance changed. Please review your order.");
      reservationId = String(rid);
    }
    const snapshot = pricingSnapshot(priced, reservationId);

    const { data: order, error } = await (supabaseAdmin as any)
      .from("orders")
      .insert({
        user_id: context.userId,
        status: "processing",
        subtotal: q.merchandiseCents / 100,
        shipping: q.shippingCents / 100,
        total: q.totalCents / 100,
        payment_method: paymentMethod,
        contact_name: `${firstName} ${lastName}`.trim(),
        contact_email: email,
        contact_phone: phone,
        shipping_address: shippingAddress,
        notes,
        discount_code_id: snapshot.discount_code_id,
        discount_code: snapshot.discount_code,
        discount_code_kind: snapshot.discount_code_kind,
        code_discount_cents: snapshot.code_discount_cents,
        referrer_user_id: snapshot.referrer_user_id,
        credit_units: snapshot.credit_units,
        credit_cents: snapshot.credit_cents,
        credit_reservation_id: reservationId,
        pricing_snapshot: snapshot,
      })
      .select("id, order_number")
      .single();
    if (error) {
      if (reservationId) await (supabaseAdmin as any).rpc("release_store_credit", { _reservation_id: reservationId });
      throw error;
    }

    const { error: itemError } = await (supabaseAdmin as any)
      .from("order_items")
      .insert(priced.lines.map((line) => ({ ...line, order_id: order.id })));
    if (itemError) throw itemError;

    // Keep the saved profile in step with what they entered at checkout.
    await context.supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        address_line: addressLine,
        city,
        state,
        postcode,
        postal_address: shippingAddress,
      })
      .eq("id", context.userId);

    const { tryOrderConfirmation } = await import("@/lib/order-confirmation.server");
    await tryOrderConfirmation(order.id);

    return {
      id: order.id as string,
      orderNumber: Number(order.order_number),
      reference: `TL-${order.order_number}`,
      subtotal: q.itemsCents / 100,
      discount: discountDollars(q),
      shipping: q.shippingCents / 100,
      total: q.totalCents / 100,
      paymentMethod,
      shippingMethod,
    };
  });

export const saveOrderPaymentReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; reference: string }) => input)
  .handler(async ({ data, context }) => {
    const reference = clean(data.reference, 160);
    if (reference.length < 6) throw new Error("Please paste the full payment reference.");
    const { error } = await context.supabase
      .from("orders")
      .update({ payment_reference: reference })
      .eq("id", data.orderId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

