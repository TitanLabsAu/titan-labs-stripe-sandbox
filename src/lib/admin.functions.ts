import { CHRISTMAS_KEY, assertChristmasBase, validateChristmas, type ChristmasSettings } from "@/lib/christmas";
import { normalizeCatalogueSection } from "@/lib/catalogue-sections";
import { PROMOTION_BANNERS_KEY, serialiseBannerSettings } from "@/lib/promotion-banners";
import { PEN_CASES_KEY, serialisePenCases, validatePenCasesAgainst } from "@/lib/pen-cases";
import { sanitizeProductLinks } from "@/lib/product-certificates";
import { assertResetBase, cmsKey, mergeSectionChanges, validateSection } from "@/lib/storefrontContent";
import { sanitizeBundle, parsePackSizeInput, sanitizeVariantImage } from "@/lib/products";
import { createServerFn } from "@tanstack/react-start";
import { planBulkOptionalEquipment, validateOptionalEquipment, type BulkPlanRow, type OptionalEquipmentEntry } from "@/lib/optional-equipment";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseCatalogueSection, sanitizeExtraSections, type CatalogueSection } from "@/lib/catalogue-sections";
import { orderReference } from "@/lib/order-reference";
import { canMarkManualPaid, canArchiveOrder, countsTowardSpend } from "@/lib/manual-payment";

export type AdminOrderItem = {
  variant_label?: string | null;
  variant_id?: string | null;
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
  pricing_snapshot?: import("@/integrations/supabase/types").Json;
  payment_confirmed_at?: string | null;
  id: string;
  user_id: string | null;
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
  refunded_at?: string | null;
  archived_at?: string | null;
  stripe_livemode?: boolean | null;
  archive_reason?: string | null;
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
  .inputValidator((input: { scope: "live" | "closed" | "archived" }) => input)
  .handler(async ({ data, context }): Promise<AdminOrder[]> => {
    await assertAdmin(context as any);
    const statuses = data.scope === "live" ? LIVE : CLOSED;

    let query = context.supabase
      .from("orders")
      .select(
        "id, user_id, status, tracking_number, tracking_status, subtotal, shipping, total, created_at, delivered_at, order_number, payment_method, payment_reference, payment_confirmed, payment_confirmed_at, pricing_snapshot, refunded_at, archived_at, archive_reason, contact_name, contact_email, contact_phone, shipping_address, notes, order_items(id, product_name, product_slug, variant_label, variant_id, unit_price, quantity)",
      );
    query =
      data.scope === "archived"
        ? query.not("archived_at", "is", null)
        : query.in("status", statuses).is("archived_at", null);
    const { data: orders, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (orders ?? []) as unknown as AdminOrder[];
    const userIds = [...new Set(rows.map((o) => o.user_id).filter(Boolean))] as string[];
    const { data: profiles } = userIds.length
      ? await context.supabase
          .from("profiles")
          .select(
            "id, email, first_name, last_name, phone_number, address_line, city, state, postcode, postal_address",
          )
          .in("id", userIds)
      : { data: [] as any[] };

    const byId = new Map<string, AdminCustomer>();
    for (const p of profiles ?? []) {
      const { id, ...rest } = p as any;
      byId.set(id as string, rest as AdminCustomer);
    }

    return rows.map((o) => ({ ...o, customer: o.user_id ? byId.get(o.user_id) ?? null : null }));
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
    const { tryOrderCheckpointEmails } = await import("@/lib/order-checkpoint-email.server");
    await tryOrderCheckpointEmails(data.orderId);
    return { ok: true };
  });

export const adminSetPaymentConfirmed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; confirmed: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.confirmed) {
      const { data: current, error: readError } = await context.supabase
        .from("orders")
        .select("status, payment_method, payment_confirmed, refunded_at")
        .eq("id", data.orderId)
        .maybeSingle();
      if (readError) throw readError;
      if (!current) throw new Error("Order not found");
      if (current.payment_confirmed) return { ok: true, alreadyPaid: true };
      if (!canMarkManualPaid(current)) throw new Error("This order cannot be marked as paid");
      // Conditional update: only flips an unpaid, unrefunded, non-cancelled manual order; status untouched.
      let update = context.supabase
        .from("orders")
        .update({ payment_confirmed: true })
        .eq("id", data.orderId)
        .eq("payment_confirmed", false)
        .neq("status", "cancelled")
        .is("refunded_at", null);
      update = current.payment_method === null
        ? update.is("payment_method", null)
        : update.in("payment_method", ["payid", "wise", "crypto"]);
      const { data: changed, error } = await update.select("id");
      if (error && String(error.message ?? "").includes("FIRST_OFFER_STALE"))
        throw new Error("This order's 10% new-member offer has since been released or used on another order. Review and re-price it before marking paid.");
      if (error) throw error;
      if (!changed?.length) {
        // Zero rows: the row changed between the read and the write. Only an
        // already-paid eligible row is an idempotent success; a concurrent
        // cancellation/refund must surface as an error, not a silent no-op.
        const { data: recheck, error: recheckError } = await context.supabase
          .from("orders")
          .select("status, payment_method, payment_confirmed, refunded_at")
          .eq("id", data.orderId)
          .maybeSingle();
        if (recheckError) throw recheckError;
        if (recheck?.payment_confirmed && canMarkManualPaid(recheck))
          return { ok: true, alreadyPaid: true };
        throw new Error("This order changed while saving and can no longer be marked as paid");
      }
    } else {
      const { error } = await context.supabase
        .from("orders")
        .update({ payment_confirmed: false })
        .eq("id", data.orderId);
      if (error) throw error;
    }
    const { tryOrderCheckpointEmails } = await import("@/lib/order-checkpoint-email.server");
    await tryOrderCheckpointEmails(data.orderId);
    // Stock settles via the paid-order database trigger; surface the outcome truthfully.
    // A stock problem never fails the confirmed payment — it is recorded durably for retry.
    if (data.confirmed) {
      const { data: settle, error: settleError } = await (context.supabase as any).rpc("retry_stock_settlement", { _order_id: data.orderId });
      if (settleError) return { ok: true, stock: "exception" as const, stockError: settleError.message };
      const status = (settle as any)?.status as string | undefined;
      if (status === "exception") return { ok: true, stock: "exception" as const, stockError: "Stock could not be deducted — see Admin notifications." };
      return { ok: true, stock: (status ?? "settled") as "settled" | "already_settled" | "nothing_to_settle" | "not_payable" };
    }
    return { ok: true };
  });

/** Reversible soft archive ("delete payment"): hides terminal unpaid/cancelled records; never touches amounts, Stripe or ledgers. */
export const adminArchiveOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; archive: boolean; reason?: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.archive) {
      const { data: cur, error: readError } = await context.supabase
        .from("orders")
        .select("status, payment_method, payment_confirmed, payment_confirmed_at, pricing_snapshot, refunded_at, archived_at")
        .eq("id", data.orderId)
        .maybeSingle();
      if (readError) throw readError;
      if (!cur) throw new Error("Order not found");
      if (cur.archived_at) return { ok: true, unchanged: true };
      if (!canArchiveOrder(cur)) throw new Error("Only unpaid or cancelled orders can be removed");
      // Write-time guard: still unarchived and still unpaid-or-cancelled.
      const { data: changed, error } = await context.supabase
        .from("orders")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: context.userId,
          archive_reason: (data.reason ?? "").trim().slice(0, 200) || null,
        })
        .eq("id", data.orderId)
        .is("archived_at", null)
        .or("status.eq.cancelled,payment_confirmed.eq.false")
        .select("id");
      if (error) throw error;
      if (!changed?.length) throw new Error("This order changed while saving and was not removed");
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("orders")
      .update({ archived_at: null, archived_by: null, archive_reason: null })
      .eq("id", data.orderId)
      .not("archived_at", "is", null);
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
    const { tryOrderCheckpointEmails } = await import("@/lib/order-checkpoint-email.server");
    await tryOrderCheckpointEmails(data.orderId);
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
        "id, user_id, order_number, total, tracking_number, contact_email, contact_name, payment_confirmed, notes, order_items(product_name, quantity, unit_price)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Order not found");

    let receiptData: Record<string, unknown> = {};
    if (data.template === "order-confirmation") {
      const receiptLib = await import("./order-receipt");
      const saved = await context.supabase.from("orders").select(receiptLib.RECEIPT_ORDER_COLUMNS).eq("id", data.orderId).single();
      if (saved.error) throw saved.error;
      const savedOrder = saved.data as unknown as import("./order-receipt").SavedReceiptOrder;
      if (process.env['TITAN_RECEIPT_ATTACHMENTS_ENABLED'] === 'true') {
        const { prepareRequiredReceiptEmail } = await import("./required-receipt-email.server");
        await prepareRequiredReceiptEmail(savedOrder);
      }
      // Approved branded content, same saved receipt as the automatic worker.
      receiptData = { receipt: receiptLib.receiptFromOrder(receiptLib.ownerVisibleReceiptOrder(savedOrder)), orderId: (order as any).id };
    }
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", (order as any).user_id)
      .maybeSingle();

    const email = (order as any).contact_email || (profile as any)?.email;
    if (!email) throw new Error("This customer has no email address on file.");

    const money = (amount: number) => `$${Number(amount).toFixed(2)} AUD`;
    const templateData: Record<string, any> = {
      orderNumber: orderReference(order as any),
      customerName: (order as any).contact_name || (profile as any)?.first_name || "there",
      paymentConfirmed: Boolean((order as any).payment_confirmed),
      shippingMethod: /Shipping: Standard/.test((order as any).notes ?? "") ? "Standard tracked" : "Australia Post Express",
      total: money((order as any).total),
      trackingNumber: (order as any).tracking_number ?? "",
      items: ((order as any).order_items ?? []).map(
        (i: any) => `${i.quantity} × ${i.product_name} — ${money(i.unit_price * i.quantity)}`,
      ),
      ...receiptData,
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
      .select("user_id, status, total, payment_confirmed, refunded_at, stripe_livemode, created_at, order_items(product_name, quantity)");

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
      // Only successful purchases count; failed/cancelled/refunded/unpaid attempts are excluded.
      // Active = fulfilment queue (paid or awaiting payment); everything else counts paid purchases only.
      if ((o.status === "processing" || o.status === "shipped") && o.stripe_livemode !== false) s.live_count += 1;
      stats.set(o.user_id, s);
      if (!countsTowardSpend(o)) continue;
      s.order_count += 1;
      if (o.status === "delivered") s.delivered_count += 1;
      s.total_spent = Math.round(s.total_spent * 100 + Number(o.total ?? 0) * 100) / 100;
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
        "id, user_id, status, tracking_number, tracking_status, subtotal, shipping, total, created_at, delivered_at, payment_method, payment_confirmed, payment_confirmed_at, pricing_snapshot, refunded_at, archived_at, stripe_livemode, order_number, order_items(id, product_name, product_slug, variant_label, variant_id, unit_price, quantity)",
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

/* ---------------- Products ---------------- */

export type AdminProductLink = import("./products").ProductLink;
export type AdminProductVariant = {
  salePrice?: number | null;
  promoLabel?: string;
  hotProduct?: boolean;

  id: string;
  label: string;
  price: number;
  stock?: number | null;
  cost?: number | null;
  comingSoon?: boolean;
  reconVialMg?: number | null;
  reconWaterMl?: number | null;
  reconDoseMg?: number | null;
  reconNotes?: string;
  image?: string | null;
  contents?: { slug: string; name: string; quantity: number }[];
  packSize?: number;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  sale_price: number | null;
  promo_label: string;
  sub_description?: string;
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
  catalogue_section?: CatalogueSection;
  extra_catalogue_sections?: CatalogueSection[];
  starter_kit_enabled?: boolean;
  unlimited_stock?: boolean;
  optional_equipment?: OptionalEquipmentEntry[] | null;
  v2_pen_offer_enabled?: boolean;
};

const PRODUCT_COLS =
  "id, slug, name, price, sale_price, promo_label, sub_description, product_variants, image_url, alt, blurb, description, details, categories, protocol, recon_vial_mg, recon_water_ml, recon_dose_mg, recon_notes, product_links, active, coming_soon, sort_order, stock_quantity, catalogue_section, starter_kit_enabled, unlimited_stock, optional_equipment, v2_pen_offer_enabled, extra_catalogue_sections";

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
    // Kit pricing is retired (10x bulk-kit removed). Included Equipment
    // (contents) is display-only and allowed for every section.
    const isEquipmentSection = normalizeCatalogueSection(data.catalogue_section) === "equipment";
    const variants = (data.product_variants ?? [])
      .map((v) => ({
        id: String(v.id || crypto.randomUUID()),
        label: String(v.label ?? "").trim(),
        price: Number(v.price ?? 0),
        salePrice: optNum(v.salePrice),
        promoLabel: String(v.promoLabel ?? "").trim().slice(0, 80),
        ...(typeof v.hotProduct === "boolean" ? { hotProduct: v.hotProduct } : {}),
        stock: Math.max(0, Math.trunc(Number(v.stock ?? 0)) || 0),
        cost: optNum(v.cost),
        comingSoon: Boolean(v.comingSoon),
        reconVialMg: optNum(v.reconVialMg),
        reconWaterMl: optNum(v.reconWaterMl),
        reconDoseMg: optNum(v.reconDoseMg),
        reconNotes: String(v.reconNotes ?? ""),
        image: sanitizeVariantImage(v.image),
        contents: sanitizeBundle(v.contents),
        packSize: isEquipmentSection ? parsePackSizeInput(v.packSize ?? 1, String(v.label ?? "")) : 1,
      }))
      .filter((v) => {
        if (!v.label && !(v.price > 0)) return false;
        if (!v.label || !Number.isFinite(v.price) || v.price <= 0)
          throw new Error(`Each option needs a name and a price above $0${v.label ? ` (${v.label})` : ""}.`);
        return true;
      });
    for (const v of variants) {
      if (v.salePrice !== null && (!Number.isFinite(v.salePrice) || v.salePrice <= 0 || v.salePrice >= v.price))
        throw new Error(`Sale price for ${v.label} must be greater than zero and below its regular price.`);
    }
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
      sub_description: String(data.sub_description ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
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
      product_links: sanitizeProductLinks(data.product_links),
      active: data.active ?? true,
      sort_order: Number(data.sort_order ?? 0),
      stock_quantity: totalStock,
      catalogue_section: parseCatalogueSection(data.catalogue_section),
      ...(data.extra_catalogue_sections !== undefined
        ? { extra_catalogue_sections: sanitizeExtraSections(data.extra_catalogue_sections, parseCatalogueSection(data.catalogue_section)) }
        : {}),
      starter_kit_enabled: data.starter_kit_enabled ?? true,
      // Server enforces Equipment-only; Range/Pens always remain tracked.
      unlimited_stock:
        data.unlimited_stock === true && parseCatalogueSection(data.catalogue_section) === "equipment",
    };
    // Optional add-ons: validated against stored Equipment rows; undefined leaves the saved value untouched.
    let optionalEquipment: OptionalEquipmentEntry[] | null | undefined = undefined;
    if (data.optional_equipment !== undefined) {
      const { data: rows, error: rowsError } = await context.supabase
        .from("products")
        .select("slug, catalogue_section, product_variants");
      if (rowsError) throw rowsError;
      optionalEquipment = validateOptionalEquipment(
        data.optional_equipment,
        { slug: row.slug, section: row.catalogue_section, variantIds: variants.map((v) => v.id) },
        (rows ?? []) as { slug: string; catalogue_section: unknown; product_variants: unknown }[],
      );
    }
    const fullRow = {
      ...row,
      ...(optionalEquipment !== undefined ? { optional_equipment: optionalEquipment as unknown as Json } : {}),
      ...(typeof data.v2_pen_offer_enabled === "boolean" ? { v2_pen_offer_enabled: data.v2_pen_offer_enabled } : {}),
    };
    if (!row.image_url.trim() && !data.id) throw new Error("A product photo is required");
    if (data.id) {
      const { error } = await context.supabase.from("products").update(fullRow).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("products").insert(fullRow);
      if (error) throw error;
    }
    return { ok: true };
  });

/**
 * Bulk optional equipment: preview (apply=false) or additively apply one
 * Equipment add-on to all Pens, all Range products or selected products.
 * Writes are compare-and-set on `updated_at`, so a product edited since the
 * preview is reported as a conflict and left untouched.
 */
export const adminBulkOptionalEquipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    equipmentSlug: string;
    variantIds: string[] | null;
    target: "pens" | "range" | "selected";
    slugs?: string[];
    apply: boolean;
    expected?: Record<string, string>;
  }) => {
    if (!/^[a-z0-9-]{1,120}$/.test(String(input?.equipmentSlug ?? ""))) throw new Error("Choose an equipment item");
    if (!["pens", "range", "selected"].includes(input.target)) throw new Error("Choose which products to update");
    const slugs = Array.isArray(input.slugs) ? input.slugs.filter((x) => /^[a-z0-9-]{1,120}$/.test(String(x))).slice(0, 500) : [];
    if (input.target === "selected" && !slugs.length) throw new Error("Select at least one product");
    const variantIds = Array.isArray(input.variantIds) ? input.variantIds.map(String).filter((x) => /^[A-Za-z0-9_-]{1,120}$/.test(x)) : null;
    const expected: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.expected ?? {})) if (typeof v === "string") expected[String(k)] = v;
    return { equipmentSlug: input.equipmentSlug, variantIds: variantIds?.length ? variantIds : null, target: input.target, slugs, apply: input.apply === true, expected };
  })
  .handler(async ({ data, context }): Promise<{ rows: (BulkPlanRow & { updatedAt: string; result?: "applied" | "conflict" })[] }> => {
    await assertAdmin(context as any);
    const { data: all, error } = await context.supabase
      .from("products")
      .select("id, slug, name, catalogue_section, starter_kit_enabled, optional_equipment, product_variants, updated_at");
    if (error) throw error;
    const rows = (all ?? []) as any[];
    const kit = rows.find((r) => r.slug === data.equipmentSlug);
    if (!kit || normalizeCatalogueSection(kit.catalogue_section) !== "equipment") throw new Error("That item is not an Equipment product");
    const targets = rows.filter((r) => {
      const s = normalizeCatalogueSection(r.catalogue_section);
      if (data.target === "selected") return data.slugs.includes(r.slug);
      return s === data.target;
    });
    const plan = planBulkOptionalEquipment({ slug: data.equipmentSlug, variantIds: data.variantIds }, targets);
    const out: (BulkPlanRow & { updatedAt: string; result?: "applied" | "conflict" })[] = [];
    for (const p of plan) {
      const t = targets.find((x) => x.id === p.id)!;
      const row = { ...p, updatedAt: String(t.updated_at) };
      if (!data.apply || p.action !== "add") { out.push(row); continue; }
      // Only rows the Admin reviewed, unchanged since review.
      if (data.expected[p.id] !== row.updatedAt) { out.push({ ...row, result: "conflict" }); continue; }
      const validated = validateOptionalEquipment(
        p.after,
        { slug: t.slug, section: t.catalogue_section, variantIds: (Array.isArray(t.product_variants) ? t.product_variants : []).map((v: any) => String(v?.id ?? "")).filter(Boolean) },
        rows,
      );
      const { data: updated, error: upErr } = await context.supabase
        .from("products")
        .update({ optional_equipment: validated as unknown as Json })
        .eq("id", p.id)
        .eq("updated_at", t.updated_at)
        .select("id");
      if (upErr) throw upErr;
      out.push({ ...row, after: validated ?? [], result: updated?.length ? "applied" : "conflict" });
    }
    return { rows: out };
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
    if (data.key === "order_admin_email" || data.key === "order_admin_email_align") throw new Error("This setting is private and cannot be saved as public content");
    let body = data.key === PROMOTION_BANNERS_KEY ? serialiseBannerSettings(JSON.parse(data.body)) : data.body;
    if (data.key === PEN_CASES_KEY) {
      const parsed = JSON.parse(serialisePenCases(JSON.parse(data.body)));
      const slugs = parsed.cases.flatMap((c: { productSlug: string | null; penSlug?: string | null }) => [c.productSlug, c.penSlug ?? null]).filter(Boolean);
      const { data: rows, error: rowsError } = slugs.length
        ? await context.supabase.from("products").select("slug, catalogue_section, product_variants").in("slug", slugs)
        : { data: [], error: null };
      if (rowsError) throw rowsError;
      body = serialisePenCases(validatePenCasesAgainst(parsed, (rows ?? []) as any[]));
    }
    const { error } = await context.supabase
      .from("site_content")
      .upsert({ key: data.key, body }, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });

const PRIVATE_KEYS = ["order_admin_email"] as const;

export const adminGetPrivateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => {
    if (!(PRIVATE_KEYS as readonly string[]).includes(input.key)) throw new Error("Unknown setting");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: row, error } = await context.supabase.from("admin_private_settings").select("body").eq("key", data.key).maybeSingle();
    if (error) throw error;
    return { body: (row as any)?.body ?? "" };
  });

export const adminSavePrivateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; body: string }) => {
    if (!(PRIVATE_KEYS as readonly string[]).includes(input.key)) throw new Error("Unknown setting");
    const body = String(input.body ?? "").trim();
    if (input.key === "order_admin_email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body)) throw new Error("Enter a valid email address");
    return { key: input.key, body };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("admin_private_settings").upsert({ key: data.key, body: data.body }, { onConflict: "key" });
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
  code_kind: "referral" | "member";
  min_spend_cents: number;
  combine_multibuy: boolean;
  combine_crypto: boolean;
  combine_credit: boolean;
};

const DISCOUNT_COLS =
  "id, code, discount_type, value, max_uses, times_used, user_id, milestone, note, active, created_at, expires_at, code_kind, min_spend_cents, combine_multibuy, combine_crypto, combine_credit";

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



/* ---------------- Storefront CMS ---------------- */

export const adminSaveStorefrontSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; reset?: boolean; changes?: Record<string, unknown>; base?: Record<string, unknown> }) => {
    const id = String(input.id);
    const changes = validateSection(id, input.changes ?? {});
    const base = input.base && typeof input.base === "object" ? input.base : {};
    return { id, reset: input.reset === true, changes, base };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const key = cmsKey(data.id);
    const { data: row, error: readError } = await context.supabase.from("site_content").select("body").eq("key", key).maybeSingle();
    if (readError) throw readError;
    const currentRaw: string | undefined = (row as any)?.body ?? undefined;
    const body = data.reset
      ? (assertResetBase(data.id, currentRaw, data.base), "{}")
      : JSON.stringify(mergeSectionChanges(data.id, currentRaw, data.changes, data.base));
    const conflict = "This section was changed by someone else while you were editing. Reload and try again.";
    if (row) {
      // Compare-and-set: only write if the stored body is exactly what we merged against.
      const { data: updated, error } = await context.supabase.from("site_content").update({ body }).eq("key", key).eq("body", currentRaw as string).select("key");
      if (error) throw error;
      if (!updated || updated.length !== 1) throw new Error(conflict);
    } else {
      const { error } = await context.supabase.from("site_content").insert({ key, body });
      if (error) {
        if ((error as any).code === "23505") throw new Error(conflict);
        throw error;
      }
    }
    return { ok: true as const, raw: body };
  });



/* Seasonal appearance: full-document validation, admin auth and optimistic concurrency. */
export const adminSaveChristmasSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { settings: ChristmasSettings; expectedRaw: string | undefined }) => ({
    settings: validateChristmas(input.settings),
    expectedRaw: typeof input.expectedRaw === "string" ? input.expectedRaw : undefined,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: row, error: readError } = await context.supabase.from("site_content").select("body").eq("key", CHRISTMAS_KEY).maybeSingle();
    if (readError) throw readError;
    const current = row ? (row as any).body as string : undefined;
    assertChristmasBase(current, data.expectedRaw);
    const body = JSON.stringify(data.settings);
    if (row) {
      const { data: updated, error } = await context.supabase.from("site_content").update({ body }).eq("key", CHRISTMAS_KEY).eq("body", current!).select("key");
      if (error) throw error;
      if (!updated || updated.length !== 1) throw new Error("Christmas settings changed while you were editing. Reload before saving.");
    } else {
      const { error } = await context.supabase.from("site_content").insert({ key: CHRISTMAS_KEY, body });
      if (error) {
        if ((error as any).code === "23505") throw new Error("Christmas settings changed while you were editing. Reload before saving.");
        throw error;
      }
    }
    return { ok: true as const, raw: body };
  });
