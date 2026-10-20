import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

/** Server-only queue. Provider idempotency deduplicates concurrent sends/retries. */
export async function sendPendingOrderConfirmations(orderId?: string) {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  // The queue is introduced by migration 0016; generated database types lag it.
  const db = supabaseAdmin as unknown as SupabaseClient;
  let query = db
    .from("order_confirmation_queue")
    .select("order_id")
    .is("completed_at", null)
    .order("created_at")
    .limit(20);
  if (orderId) query = query.eq("order_id", orderId);
  const { data: pending, error } = await query;
  if (error) throw error;
  let sent = 0;
  for (const row of pending ?? []) {
    try {
      const { data: savedOrder, error: readError } = await db
        .from("orders")
        .select(
          "id, order_number, created_at, subtotal, shipping, total, status, payment_confirmed, payment_confirmed_at, refunded_at, payment_method, pricing_snapshot, discount_code, contact_email, contact_name, contact_phone, shipping_address, notes, order_items(product_name, variant_label, variant_id, quantity, unit_price)",
        )
        .eq("id", row.order_id)
        .single();
      if (readError) throw readError;
      const order = savedOrder as {
        id: string;
        order_number: number;
        total: number;
        status: string;
        payment_confirmed: boolean;
        contact_email: string | null;
        contact_name: string | null;
        notes: string | null;
        order_items: Array<{
          product_name: string;
          variant_label: string | null;
          quantity: number;
          unit_price: number;
        }>;
      };
      // Non-atomic legacy checkout inserts lines after the order; retry later.
      if (!order.order_items?.length) continue;
      let outcome = "cancelled";
      if (order.status !== "cancelled") {
        if (!order.contact_email) throw new Error("Order has no contact email");
        const { prepareRequiredReceiptEmail } = await import("@/lib/required-receipt-email.server");
        await prepareRequiredReceiptEmail(savedOrder as import("@/lib/order-receipt").SavedReceiptOrder);
        const money = (value: number) => `$${Number(value).toFixed(2)} AUD`;
        // Approved branded content: saved historical receipt, independent of the attachment flag.
        const { receiptFromOrder, ownerVisibleReceiptOrder } = await import("@/lib/order-receipt");
        const payload = {
          orderNumber: `TL-${order.order_number}`,
          customerName: order.contact_name || "there",
          total: money(order.total),
          paymentConfirmed: Boolean(order.payment_confirmed),
          shippingMethod: /Shipping: Standard/.test(order.notes ?? "")
            ? "Standard tracked"
            : "Australia Post Express",
          items: order.order_items.map(
            (i) =>
              `${i.quantity} × ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} — ${money(i.unit_price * i.quantity)}`,
          ),
          receipt: receiptFromOrder(ownerVisibleReceiptOrder(savedOrder as import("@/lib/order-receipt").SavedReceiptOrder)),
          orderId: order.id,
        };
        const result = await sendTemplateEmail(
          "order-confirmation",
          order.contact_email,
          {
            idempotencyKey: `order-confirmation-${order.id}-none`,
            templateData: payload,
          },
        );
        outcome = result.sent ? "sent" : "recipient_suppressed";
        if (result.sent) {
          sent++;
          const { sendAdminOrderCopy } = await import("@/lib/order-admin-copy.server");
          await sendAdminOrderCopy(
            "order-confirmation",
            payload,
            `order-confirmation-${order.id}-none`,
          );
        }
      }
      const { error: updateError } = await db
        .from("order_confirmation_queue")
        .update({ completed_at: new Date().toISOString(), outcome })
        .eq("order_id", row.order_id);
      if (updateError) throw updateError;
    } catch (error) {
      console.error("[order-confirmation] send failed", row.order_id, error);
    }
  }
  return { sent };
}

/** Email failure must never turn an accepted order into a failed checkout. */
export async function tryOrderConfirmation(orderId: string) {
  try {
    await sendPendingOrderConfirmations(orderId);
  } catch (error) {
    console.error("[order-confirmation] queue unavailable", error);
  }
}
