import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

type Kind = "payment-confirmed" | "dispatched" | "delivered";
type Order = {
  id: string;
  order_number: number;
  total: number;
  status: string;
  payment_confirmed: boolean;
  contact_email: string | null;
  contact_name: string | null;
  tracking_number: string | null;
  notes: string | null;
};

/** The unique database event and provider key dedupe repeated status updates. */
export async function sendPendingOrderCheckpointEmails(orderId?: string) {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  let query = db
    .from("order_checkpoint_email_queue")
    .select("order_id, kind, attempts")
    .is("completed_at", null)
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(50);
  if (orderId) query = query.eq("order_id", orderId);
  const { data: pending, error } = await query;
  if (error) throw error;
  let sent = 0;
  for (const event of pending ?? []) {
    const kind = event.kind as Kind;
    try {
      const { data, error: readError } = await db
        .from("orders")
        .select(
          "id, order_number, created_at, subtotal, shipping, total, status, payment_confirmed, payment_confirmed_at, refunded_at, payment_method, pricing_snapshot, discount_code, contact_email, contact_name, contact_phone, shipping_address, tracking_number, notes, order_items(product_name, variant_label, variant_id, quantity, unit_price)",
        )
        .eq("id", event.order_id)
        .single();
      if (readError) throw readError;
      const order = data as Order;
      const valid =
        order.status !== "cancelled" &&
        (kind === "payment-confirmed"
          ? order.payment_confirmed
          : kind === "dispatched"
            ? order.status === "shipped" &&
              Boolean(order.tracking_number?.trim())
            : kind === "delivered"
              ? order.status === "delivered"
              : false);
      let outcome = "superseded";
      if (valid) {
        if (!order.contact_email) throw new Error("missing_recipient");
        if (kind === "payment-confirmed") {
          const { prepareRequiredReceiptEmail } = await import("@/lib/required-receipt-email.server");
          await prepareRequiredReceiptEmail(data as import("@/lib/order-receipt").SavedReceiptOrder);
        }
        const template =
          kind === "dispatched" ? "order-dispatched" : "order-checkpoint";
        const result = await sendTemplateEmail(template, order.contact_email, {
          idempotencyKey: `customer-order-${kind}-${order.id}`,
          templateData: {
            kind,
            orderNumber: `TL-${order.order_number}`,
            customerName: order.contact_name || "there",
            trackingNumber: order.tracking_number || "",
            total: `$${Number(order.total).toFixed(2)} AUD`,
            shippingMethod: /Shipping: Standard/.test(order.notes ?? "")
              ? "Standard tracked"
              : "Australia Post Express",
          },
        });
        outcome = result.sent ? "sent" : "recipient_suppressed";
        if (result.sent) {
          sent++;
          const { sendAdminOrderCopy } = await import("@/lib/order-admin-copy.server");
          await sendAdminOrderCopy(
            template,
            {
              kind,
              orderNumber: `TL-${order.order_number}`,
              customerName: order.contact_name || "there",
              trackingNumber: order.tracking_number || "",
              total: `$${Number(order.total).toFixed(2)} AUD`,
              shippingMethod: /Shipping: Standard/.test(order.notes ?? "")
                ? "Standard tracked"
                : "Australia Post Express",
            },
            `customer-order-${kind}-${order.id}`,
          );
        }
      }
      const { error: updateError } = await db
        .from("order_checkpoint_email_queue")
        .update({
          completed_at: new Date().toISOString(),
          outcome,
          last_error: null,
        })
        .eq("order_id", event.order_id)
        .eq("kind", kind);
      if (updateError) throw updateError;
    } catch (error) {
      console.error(
        "[order-checkpoint-email] send failed",
        event.order_id,
        kind,
        error,
      );
      const attempts = Number(event.attempts) + 1;
      await db
        .from("order_checkpoint_email_queue")
        .update({
          attempts,
          last_error: error instanceof Error && error.message.startsWith("RECEIPT_") ? error.message.slice(0, 240) : "send_failed",
          next_attempt_at: new Date(
            Date.now() + Math.min(attempts * 15, 60) * 60_000,
          ).toISOString(),
        })
        .eq("order_id", event.order_id)
        .eq("kind", kind);
      if (attempts === 3)
        await db.from("admin_notifications").insert({
          order_id: event.order_id,
          title: "Order email needs attention",
          body: `The ${kind} email has failed three times. Automatic retries will continue.`,
        });
    }
  }
  return { sent };
}

export async function tryOrderCheckpointEmails(orderId?: string) {
  try {
    await sendPendingOrderCheckpointEmails(orderId);
  } catch (error) {
    console.error("[order-checkpoint-email] queue unavailable", error);
  }
}
