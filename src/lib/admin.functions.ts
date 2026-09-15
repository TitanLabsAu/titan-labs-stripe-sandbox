import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminOrderItem = {
  id: string;
  product_name: string;
  product_slug: string;
  unit_price: number;
  quantity: number;
};

export type AdminCustomer = {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  postal_address: string | null;
};

export type AdminOrder = {
  id: string;
  user_id: string;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  tracking_number: string | null;
  tracking_status: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  created_at: string;
  delivered_at: string | null;
  order_items: AdminOrderItem[];
  customer: AdminCustomer | null;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const LIVE: AdminOrder["status"][] = ["processing", "shipped"];
const CLOSED: AdminOrder["status"][] = ["delivered", "cancelled"];

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: "live" | "closed" }) => input)
  .handler(async ({ data, context }): Promise<AdminOrder[]> => {
    await assertAdmin(context as any);
    const statuses = data.scope === "live" ? LIVE : CLOSED;

    const { data: orders, error } = await context.supabase
      .from("orders")
      .select(
        "id, user_id, status, tracking_number, tracking_status, subtotal, shipping, total, created_at, delivered_at, order_items(id, product_name, product_slug, unit_price, quantity)",
      )
      .in("status", statuses)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (orders ?? []) as unknown as AdminOrder[];
    const userIds = [...new Set(rows.map((o) => o.user_id))];
    if (userIds.length === 0) return [];

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select(
        "id, email, first_name, last_name, phone_number, address_line, city, state, postcode, postal_address",
      )
      .in("id", userIds);

    const byId = new Map<string, AdminCustomer>();
    for (const p of profiles ?? []) {
      const { id, ...rest } = p as any;
      byId.set(id as string, rest as AdminCustomer);
    }

    return rows.map((o) => ({ ...o, customer: byId.get(o.user_id) ?? null }));
  });

export const adminSetTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; trackingNumber: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const tracking = data.trackingNumber.trim();

    const { error } = await context.supabase
      .from("orders")
      .update({
        tracking_number: tracking === "" ? null : tracking,
        status: tracking === "" ? "processing" : "shipped",
      })
      .eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });

export const adminUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; status: AdminOrder["status"] }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase
      .from("orders")
      .update({
        status: data.status,
        delivered_at: data.status === "delivered" ? new Date().toISOString() : null,
      })
      .eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });

export type AdminNotification = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export const adminListNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminNotification[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("admin_notifications")
      .select("id, title, body, read, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AdminNotification[];
  });

export const adminMarkNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    await context.supabase.from("admin_notifications").update({ read: true }).eq("read", false);
    return { ok: true };
  });

/** Checks Australia Post now for every live order that has a tracking number. */
export const adminRefreshTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { syncAustraliaPostTracking } = await import("@/lib/auspost.server");
    return syncAustraliaPostTracking();
  });
