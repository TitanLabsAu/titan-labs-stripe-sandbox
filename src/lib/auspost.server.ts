import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const ADMIN_EMAIL = "sjrendall@live.com.au";
const TRACK_URL = "https://digitalapi.auspost.com.au/shipping/v1/track";


type TrackResult = { status: string | null; raw: unknown };

async function fetchTrackingStatus(trackingId: string): Promise<TrackResult | null> {
  const accountNumber = process.env["AUSPOST_ACCOUNT_NUMBER"];
  const username = process.env["AUSPOST_API_KEY"];
  const password = process.env["AUSPOST_API_PASSWORD"];
  if (!accountNumber || !username || !password) {
    throw new Error("Australia Post credentials are not configured");
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await fetch(`${TRACK_URL}?tracking_ids=${encodeURIComponent(trackingId)}`, {
    headers: {
      "Account-Number": accountNumber,
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.error(`[auspost] ${trackingId} lookup failed: ${res.status}`);
    return null;
  }

  const json = (await res.json()) as any;
  const result = json?.tracking_results?.[0];
  const status: string | null =
    result?.status ?? result?.consignment?.status ?? result?.trackable_items?.[0]?.status ?? null;
  return { status, raw: result };
}

export type SyncSummary = { checked: number; delivered: number; errors: number };

/**
 * Looks up Australia Post for every live order that has a tracking number.
 * Orders reported as delivered move to the delivered status and raise an admin notification.
 */
export async function syncAustraliaPostTracking(): Promise<SyncSummary> {
  const summary: SyncSummary = { checked: 0, delivered: 0, errors: 0 };

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, tracking_number, status, user_id, total")
    .in("status", ["processing", "shipped"])
    .not("tracking_number", "is", null);
  if (error) throw error;

  for (const order of orders ?? []) {
    const tracking = order.tracking_number;
    if (!tracking) continue;
    summary.checked += 1;

    let result: TrackResult | null = null;
    try {
      result = await fetchTrackingStatus(tracking);
    } catch (err) {
      console.error("[auspost] lookup error", err);
      summary.errors += 1;
      continue;
    }
    if (!result) {
      summary.errors += 1;
      continue;
    }

    const status = result.status ?? null;
    const isDelivered = (status ?? "").toLowerCase().includes("deliver");

    await supabaseAdmin
      .from("orders")
      .update({
        tracking_status: status,
        tracking_checked_at: new Date().toISOString(),
        ...(isDelivered ? { status: "delivered", delivered_at: new Date().toISOString() } : {}),
      })
      .eq("id", order.id);

    if (isDelivered) {
      summary.delivered += 1;
      await supabaseAdmin.from("admin_notifications").insert({
        order_id: order.id,
        title: `Order #${order.id.slice(0, 8)} delivered`,
        body: `Australia Post has marked tracking ${tracking} as delivered. The order moved to Closed Orders.`,
      });

      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", order.user_id)
          .maybeSingle();

        const customerName =
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          profile?.email ||
          "a customer";

        await sendTemplateEmail("order-delivered", ADMIN_EMAIL, {
          templateData: {
            orderNumber: order.id.slice(0, 8),
            customerName,
            trackingNumber: tracking,
            total: `$${Number(order.total).toFixed(2)}`,
          },
          idempotencyKey: `order-delivered-${order.id}`,
        });
      } catch (err) {
        console.error("[auspost] delivery email failed", err);
      }
    }

  }

  return summary;
}
