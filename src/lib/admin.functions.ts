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
  order_number: number | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_confirmed: boolean | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  shipping_address: string | null;
  notes: string | null;
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
        "id, user_id, status, tracking_number, tracking_status, subtotal, shipping, total, created_at, delivered_at, order_number, payment_method, payment_reference, payment_confirmed, contact_name, contact_email, contact_phone, shipping_address, notes, order_items(id, product_name, product_slug, unit_price, quantity)",
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

export const adminSetPaymentConfirmed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; confirmed: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase
      .from("orders")
      .update({ payment_confirmed: data.confirmed })
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

export const adminSendOrderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { orderId: string; template: "order-confirmation" | "order-dispatched" }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const { data: order, error } = await context.supabase
      .from("orders")
      .select(
        "id, user_id, total, tracking_number, order_items(product_name, quantity, unit_price)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Order not found");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", (order as any).user_id)
      .maybeSingle();

    const email = (profile as any)?.email as string | undefined;
    if (!email) throw new Error("This customer has no email address on file.");

    const money = (cents: number) => `$${(Number(cents) / 100).toFixed(2)}`;
    const templateData: Record<string, any> = {
      orderNumber: String((order as any).id).slice(0, 8),
      customerName: (profile as any)?.first_name ?? "there",
      total: money((order as any).total),
      trackingNumber: (order as any).tracking_number ?? "",
      items: ((order as any).order_items ?? []).map(
        (i: any) => `${i.quantity} × ${i.product_name} — ${money(i.unit_price * i.quantity)}`,
      ),
    };

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail(data.template, email, {
      templateData,
      idempotencyKey: `${data.template}-${(order as any).id}-${(order as any).tracking_number ?? "none"}`,
    });
    return { ...result, email };
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
  last_order_at: string | null;
  top_products: { name: string; qty: number }[];
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
      .select("user_id, status, total, created_at, order_items(product_name, quantity)");

    type Stat = {
      order_count: number;
      live_count: number;
      delivered_count: number;
      total_spent: number;
      last_order_at: string | null;
      tally: Map<string, number>;
    };

    const stats = new Map<string, Stat>();
    for (const o of (orders ?? []) as any[]) {
      const s: Stat =
        stats.get(o.user_id) ?? {
          order_count: 0,
          live_count: 0,
          delivered_count: 0,
          total_spent: 0,
          last_order_at: null,
          tally: new Map<string, number>(),
        };
      s.order_count += 1;
      if (o.status === "processing" || o.status === "shipped") s.live_count += 1;
      if (o.status === "delivered") s.delivered_count += 1;
      s.total_spent += Number(o.total ?? 0);
      if (!s.last_order_at || o.created_at > s.last_order_at) s.last_order_at = o.created_at;
      for (const item of (o.order_items ?? []) as any[]) {
        s.tally.set(item.product_name, (s.tally.get(item.product_name) ?? 0) + item.quantity);
      }
      stats.set(o.user_id, s);
    }

    return ((profiles ?? []) as any[]).map((p) => {
      const s = stats.get(p.id);
      return {
        ...(p as AdminMember),
        order_count: s?.order_count ?? 0,
        live_count: s?.live_count ?? 0,
        delivered_count: s?.delivered_count ?? 0,
        total_spent: s?.total_spent ?? 0,
        last_order_at: s?.last_order_at ?? null,
        top_products: s
          ? [...s.tally.entries()]
              .map(([name, qty]) => ({ name, qty }))
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 3)
          : [],
      };
    });
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
export type AdminProductVariant = {
  id: string;
  label: string;
  price: number;
  kitPrice?: number | null;
  stock?: number | null;
  cost?: number | null;
  reconVialMg?: number | null;
  reconWaterMl?: number | null;
  reconDoseMg?: number | null;
  reconNotes?: string;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  promo_label: string;
  kit_price: number | null;
  product_variants: AdminProductVariant[];
  image_url: string;
  alt: string;
  blurb: string;
  description: string;
  details: string[];
  categories: string[];
  protocol: string;
  recon_vial_mg: number | null;
  recon_water_ml: number | null;
  recon_dose_mg: number | null;
  recon_notes: string;
  product_links: AdminProductLink[];
  active: boolean;
  coming_soon?: boolean;
  sort_order: number;
  stock_quantity: number;
};

const PRODUCT_COLS =
  "id, slug, name, price, sale_price, promo_label, kit_price, product_variants, image_url, alt, blurb, description, details, categories, protocol, recon_vial_mg, recon_water_ml, recon_dose_mg, recon_notes, product_links, active, coming_soon, sort_order, stock_quantity";

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
    const optNum = (value: unknown) =>
      value === null || value === undefined || value === "" || Number.isNaN(Number(value))
        ? null
        : Number(value);
    const variants = (data.product_variants ?? [])
      .map((v) => ({
        id: String(v.id || crypto.randomUUID()),
        label: String(v.label ?? "").trim(),
        price: Number(v.price ?? 0),
        kitPrice: optNum(v.kitPrice),
        stock: Math.max(0, Math.trunc(Number(v.stock ?? 0)) || 0),
        cost: optNum(v.cost),
        reconVialMg: optNum(v.reconVialMg),
        reconWaterMl: optNum(v.reconWaterMl),
        reconDoseMg: optNum(v.reconDoseMg),
        reconNotes: String(v.reconNotes ?? ""),
      }))
      .filter((v) => v.label && v.price > 0);
    const variantPrices = variants.map((v) => v.price).filter((p) => p > 0);
    const basePrice = variantPrices.length > 0 ? Math.min(...variantPrices) : Number(data.price ?? 0);
    const totalStock =
      variants.length > 0
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : Math.max(0, Math.trunc(Number(data.stock_quantity ?? 0)) || 0);
    const row = {
      slug: data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: data.name.trim(),
      price: basePrice,
      sale_price:
        data.sale_price === null || data.sale_price === undefined || Number.isNaN(Number(data.sale_price))
          ? null
          : Number(data.sale_price),
      promo_label: data.promo_label ?? "",
      kit_price:
        data.kit_price === null || data.kit_price === undefined || Number.isNaN(Number(data.kit_price))
          ? null
          : Number(data.kit_price),
      product_variants: variants,
      recon_vial_mg: data.recon_vial_mg ?? null,
      recon_water_ml: data.recon_water_ml ?? null,
      recon_dose_mg: data.recon_dose_mg ?? null,
      recon_notes: data.recon_notes ?? "",
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
      stock_quantity: totalStock,
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

export const adminSetProductFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; active?: boolean; coming_soon?: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const patch: { active?: boolean; coming_soon?: boolean } = {};
    if (typeof data.active === "boolean") patch.active = data.active;
    if (typeof data.coming_soon === "boolean") patch.coming_soon = data.coming_soon;
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.id);
    if (error) throw error;
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
  expires_at: string | null;
};

const DISCOUNT_COLS =
  "id, code, discount_type, value, max_uses, times_used, user_id, milestone, note, active, created_at, expires_at";

export const adminListDiscountCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDiscountCode[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("discount_codes")
      .select(DISCOUNT_COLS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as AdminDiscountCode[];
  });

export const adminCreateDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      code: string;
      discount_type: "percent" | "fixed" | "full";
      value: number;
      maxUses?: number | null;
      expiresAt?: string | null;
      note?: string;
      userId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const code = data.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) throw new Error("A code is required");

    const isFull = data.discount_type === "full";
    const value = isFull ? 100 : Number(data.value);
    if (!(value > 0)) throw new Error("Enter a discount amount greater than zero");
    if (data.discount_type === "percent" && value > 100) {
      throw new Error("A percentage discount cannot be more than 100%");
    }

    const { error } = await context.supabase.from("discount_codes").insert({
      code,
      discount_type: (isFull ? "percent" : data.discount_type) as "percent" | "fixed",
      value,
      max_uses: data.maxUses && data.maxUses > 0 ? data.maxUses : 1000000,
      expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      note: data.note?.trim() ? data.note.trim() : null,
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
