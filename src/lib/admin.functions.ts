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

export type AdminMember = AdminCustomer & {
  id: string;
  created_at: string;
  order_count: number;
  live_count: number;
  delivered_count: number;
  total_spent: number;
};

export const adminListMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMember[]> => {
    await assertAdmin(context as any);

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select(
        "id, email, first_name, last_name, phone_number, address_line, city, state, postcode, postal_address, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: orders } = await context.supabase
      .from("orders")
      .select("user_id, status, total");

    const stats = new Map<
      string,
      { order_count: number; live_count: number; delivered_count: number; total_spent: number }
    >();
    for (const o of (orders ?? []) as any[]) {
      const s =
        stats.get(o.user_id) ??
        { order_count: 0, live_count: 0, delivered_count: 0, total_spent: 0 };
      s.order_count += 1;
      if (o.status === "processing" || o.status === "shipped") s.live_count += 1;
      if (o.status === "delivered") s.delivered_count += 1;
      s.total_spent += Number(o.total ?? 0);
      stats.set(o.user_id, s);
    }

    return ((profiles ?? []) as any[]).map((p) => ({
      ...(p as AdminMember),
      ...(stats.get(p.id) ?? {
        order_count: 0,
        live_count: 0,
        delivered_count: 0,
        total_spent: 0,
      }),
    }));
  });

export const adminGetMemberOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }): Promise<AdminOrder[]> => {
    await assertAdmin(context as any);

    const { data: orders, error } = await context.supabase
      .from("orders")
      .select(
        "id, user_id, status, tracking_number, tracking_status, subtotal, shipping, total, created_at, delivered_at, order_items(id, product_name, product_slug, unit_price, quantity)",
      )
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: profile } = await context.supabase
      .from("profiles")
      .select(
        "email, first_name, last_name, phone_number, address_line, city, state, postcode, postal_address",
      )
      .eq("id", data.userId)
      .maybeSingle();

    return ((orders ?? []) as unknown as AdminOrder[]).map((o) => ({
      ...o,
      customer: (profile as AdminCustomer) ?? null,
    }));
  });

/** Checks Australia Post now for every live order that has a tracking number. */
export const adminRefreshTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { syncAustraliaPostTracking } = await import("@/lib/auspost.server");
    return syncAustraliaPostTracking();
  });

/* ---------------- Products ---------------- */

export type AdminProductLink = { label: string; url: string };

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_url: string;
  alt: string;
  blurb: string;
  description: string;
  details: string[];
  categories: string[];
  protocol: string;
  product_links: AdminProductLink[];
  active: boolean;
  sort_order: number;
};

const PRODUCT_COLS =
  "id, slug, name, price, image_url, alt, blurb, description, details, categories, protocol, product_links, active, sort_order";

export const adminListProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminProduct[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("products")
      .select(PRODUCT_COLS)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as AdminProduct[];
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<AdminProduct> & { slug: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const row = {
      slug: data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: data.name.trim(),
      price: Number(data.price ?? 0),
      image_url: data.image_url ?? "",
      alt: data.alt ?? data.name.trim(),
      blurb: data.blurb ?? "",
      description: data.description ?? "",
      details: data.details ?? [],
      categories: data.categories ?? [],
      protocol: data.protocol ?? "",
      product_links: (data.product_links ?? []).filter((l) => l && l.url),
      active: data.active ?? true,
      sort_order: Number(data.sort_order ?? 0),
    };
    if (data.id) {
      const { error } = await context.supabase.from("products").update(row).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("products").insert(row);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- Links ---------------- */

export type AdminLink = { id: string; label: string; url: string; sort_order: number };

export const adminListLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminLink[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("site_links")
      .select("id, label, url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AdminLink[];
  });

export const adminSaveLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; label: string; url: string; sort_order?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const row = {
      label: data.label.trim(),
      url: data.url.trim(),
      sort_order: Number(data.sort_order ?? 0),
    };
    if (data.id) {
      const { error } = await context.supabase.from("site_links").update(row).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("site_links").insert(row);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminDeleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("site_links").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- Site content ---------------- */

export const adminSaveContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase
      .from("site_content")
      .upsert({ key: data.key, body: data.body }, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });

/* ---------------- Discount codes ---------------- */

export type AdminDiscountCode = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  max_uses: number;
  times_used: number;
  user_id: string | null;
  milestone: number | null;
  note: string | null;
  active: boolean;
  created_at: string;
};

export const adminListDiscountCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDiscountCode[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("discount_codes")
      .select("id, code, discount_type, value, max_uses, times_used, user_id, milestone, note, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as AdminDiscountCode[];
  });

export const adminCreateDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      code: string;
      discount_type: "percent" | "fixed";
      value: number;
      singleUse: boolean;
      note?: string;
      userId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const code = data.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) throw new Error("A code is required");
    if (!(data.value > 0)) throw new Error("Enter a discount amount greater than zero");
    const { error } = await context.supabase.from("discount_codes").insert({
      code,
      discount_type: data.discount_type,
      value: data.value,
      max_uses: data.singleUse ? 1 : 1000000,
      note: data.note ?? null,
      user_id: data.userId ?? null,
    });
    if (error) throw error;
    return { ok: true, code };
  });

export const adminToggleDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase
      .from("discount_codes")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("discount_codes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
