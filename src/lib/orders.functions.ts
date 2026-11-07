import { createServerFn } from "@tanstack/react-start";
import { assertExpectedTotal } from "@/lib/order-pricing";
import type { ShippingMethodKey } from "@/lib/pricing";
import type { CheckoutMode } from "@/lib/guest-capability";

export type SubmitOrderItem = {
  slug: string;
  variantId?: string | null;
  pack?: "single" | "kit";
  freeGift?: boolean;
  quantity: number;
};

export type SubmitOrderInput = {
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
  paymentMethod: "payid" | "wise" | "crypto";
  shippingMethod?: ShippingMethodKey;
  items: SubmitOrderItem[];
  code?: string | null;
  creditUnits?: number;
  /** Total the customer was shown; a mismatch blocks order/payment creation. */
  expectedTotalCents?: number;
};

export type SubmittedOrder = {
  id: string;
  orderNumber: number;
  reference: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: "payid" | "wise" | "crypto" | "card";
  shippingMethod: ShippingMethodKey;
  guest?: boolean;
};

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input: SubmitOrderInput) => input)
  .handler(async ({ data }): Promise<SubmittedOrder> => {
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    if (!addressLine || !city || !state || !postcode) {
      throw new Error("Please complete your delivery address.");
    }

    const paymentMethod =
      data.paymentMethod === "crypto" ? "crypto" : data.paymentMethod === "wise" ? "wise" : "payid";
    if (paymentMethod === "wise") {
      // Wise is only accepted while the owner has it switched on in Admin.
      const { supabaseAdmin: cms } = await import("@/integrations/supabase/client.server");
      const { data: row } = await (cms as any)
        .from("site_content").select("body").eq("key", "payment_wise_enabled").maybeSingle();
      if (row?.body !== "true") throw new Error("Wise is not currently available. Please choose another payment method.");
    }
    const shippingMethod: ShippingMethodKey =
      data.shippingMethod === "standard" ? "standard" : "express";

    const { resolveBuyer, requireAcknowledgement, ownerColumns, buyerEmails } = await import(
      "@/lib/checkout-buyer.server"
    );
    const buyer = await resolveBuyer(data.mode === "guest" ? "guest" : "member");
    const ackId = await requireAcknowledgement(buyer, data.acknowledgementId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { priceCheckout, pricingNote, pricingSnapshot, discountDollars, claimFirstOffer, claimReferralRedemption } = await import(
      "@/lib/checkout-pricing.server"
    );
    if (buyer.userId) {
      // Free a first-offer claim held by a superseded card payment only after that intent is terminally cancelled.
      const secret = process.env["STRIPE_SECRET_KEY"];
      if (secret) {
        const Stripe = (await import("stripe")).default;
        const { rolloverFirstOfferClaims, stripeRolloverDeps } = await import("@/lib/first-offer-rollover.server");
        await rolloverFirstOfferClaims(buyer.userId, stripeRolloverDeps(db, new Stripe(secret)));
      }
    }
    const emails = buyerEmails(buyer, email);
    const priced = await priceCheckout(
      db,
      { userId: buyer.userId, emails, emailVerified: buyer.emailVerified },
      { items, shippingMethod, paymentMethod, code: data.code ?? null, creditUnits: data.creditUnits ?? 0 },
    );
    if (data.code && priced.codeError) throw new Error(priced.codeError);
    const q = priced.quote;
    assertExpectedTotal(data.expectedTotalCents, q.totalCents);

    const shippingAddress = [addressLine, city, `${state} ${postcode}`.trim()]
      .filter(Boolean)
      .join(", ");
    const shippingNote = `Shipping: ${
      shippingMethod === "standard" ? "Standard tracked (3-7 days)" : "Express + insurance (1-4 days)"
    }`;
    const notes = [clean(data.notes, 500), shippingNote, pricingNote(q)].filter(Boolean).join("\n");

    let claimId: string | null = null;
    if (q.firstOfferApplied && buyer.userId) claimId = await claimFirstOffer(db, buyer.userId, emails, 30);

    // Referral codes are one-time per buyer: hold an atomic claim while the order awaits payment.
    let referralClaimId: string | null = null;
    if (priced.code?.rule.kind === "referral" && buyer.userId) {
      try {
        referralClaimId = await claimReferralRedemption(db, buyer.userId, emails, priced.code.id, 30);
      } catch (error) {
        if (claimId) await db.rpc("release_first_offer", { _claim_id: claimId });
        throw error;
      }
    }

    let reservationId: string | null = null;
    if (q.creditUnits > 0 && buyer.userId) {
      const { data: rid, error: reserveError } = await db.rpc("reserve_store_credit", {
        _user_id: buyer.userId, _units: q.creditUnits, _payment_attempt_id: null, _ttl_minutes: 30,
      });
      if (reserveError) {
        if (claimId) await db.rpc("release_first_offer", { _claim_id: claimId });
        if (referralClaimId) await db.rpc("release_referral_redemption", { _claim_id: referralClaimId });
        throw new Error("Your store credit balance changed. Please review your order.");
      }
      reservationId = String(rid);
    }
    const snapshot = pricingSnapshot(priced, reservationId);

    const { data: order, error } = await db
      .from("orders")
      .insert({
        ...ownerColumns(buyer),
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
        first_purchase_offer: snapshot.first_purchase_offer,
        first_offer_claim_id: claimId,
        referral_claim_id: referralClaimId,
      })
      .select("id, order_number")
      .single();
    if (error) {
      if (reservationId) await db.rpc("release_store_credit", { _reservation_id: reservationId });
      if (claimId) await db.rpc("release_first_offer", { _claim_id: claimId });
      if (referralClaimId) await db.rpc("release_referral_redemption", { _claim_id: referralClaimId });
      throw error;
    }

    const { error: itemError } = await db
      .from("order_items")
      .insert(priced.lines.map((line) => ({ ...line, order_id: order.id })));
    if (itemError) throw itemError;

    // Link the acknowledgement made by this same buyer to the new order.
    await db
      .from("order_acknowledgements")
      .update({ order_id: order.id })
      .eq("id", ackId)
      .is("order_id", null);

    if (buyer.userId) {
      // Keep the saved profile in step with what they entered at checkout.
      await db
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
        .eq("id", buyer.userId);
    }

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
      guest: buyer.kind === "guest",
    };
  });

export const saveOrderPaymentReference = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; reference: string; mode: CheckoutMode }) => input)
  .handler(async ({ data }) => {
    const reference = clean(data.reference, 160);
    if (reference.length < 6) throw new Error("Please paste the full payment reference.");
    const { resolveBuyer } = await import("@/lib/checkout-buyer.server");
    const { ownsRow } = await import("@/lib/guest-capability");
    const buyer = await resolveBuyer(data.mode === "guest" ? "guest" : "member");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: order } = await db
      .from("orders")
      .select("id, user_id, guest_session_id")
      .eq("id", String(data.orderId ?? ""))
      .maybeSingle();
    if (!ownsRow(buyer, order)) throw new Error("We couldn't find that order for this checkout.");
    const { error } = await db.from("orders").update({ payment_reference: reference }).eq("id", order.id);
    if (error) throw error;
    return { ok: true };
  });

