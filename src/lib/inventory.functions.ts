import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSkus, skuKey, type InventorySku, type RawProduct } from "@/lib/inventory";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

export type InventoryMovement = {
  id: string;
  kind: string;
  before_qty: number;
  delta: number;
  after_qty: number;
  reason: string;
  reference: string | null;
  created_at: string;
  variant_label: string | null;
};

export const adminInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ skus: InventorySku[]; fetchedAt: string; trackingSince: string | null }> => {
    await assertAdmin(context as any);
    const [products, settings, first] = await Promise.all([
      context.supabase
        .from("products")
        .select("id, slug, name, active, coming_soon, stock_quantity, catalogue_section, unlimited_stock, product_variants")
        .order("name"),
      context.supabase.from("inventory_reorder_settings").select("product_id, variant_key, threshold"),
      context.supabase.from("inventory_movements").select("created_at").order("created_at").limit(1),
    ]);
    if (products.error) throw products.error;
    if (settings.error) throw settings.error;
    const thresholds = new Map<string, number>();
    for (const s of settings.data ?? []) thresholds.set(`${s.product_id}::${s.variant_key}`, s.threshold);
    return {
      skus: buildSkus((products.data ?? []) as RawProduct[], thresholds),
      fetchedAt: new Date().toISOString(),
      trackingSince: first.data?.[0]?.created_at ?? null,
    };
  });

export const adminInventoryHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; variantId: string | null }) => input)
  .handler(async ({ data, context }): Promise<InventoryMovement[]> => {
    await assertAdmin(context as any);
    let q = context.supabase
      .from("inventory_movements")
      .select("id, kind, before_qty, delta, after_qty, reason, reference, created_at, variant_label")
      .eq("product_id", data.productId)
      .order("created_at", { ascending: false })
      .limit(100);
    q = data.variantId ? q.eq("variant_id", data.variantId) : q.is("variant_id", null);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as InventoryMovement[];
  });

export const adminAdjustInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { productId: string; variantId: string | null; kind: "receive" | "remove" | "count"; quantity: number; expectedBefore: number; reason: string; reference?: string }) => {
      if (!["receive", "remove", "count"].includes(input.kind)) throw new Error("Invalid adjustment type");
      for (const n of [input.quantity, input.expectedBefore])
        if (!Number.isInteger(n) || n < 0) throw new Error("Quantities must be whole numbers of zero or more");
      if (!String(input.reason ?? "").trim()) throw new Error("A reason is required");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: result, error } = await (context.supabase as any).rpc("adjust_inventory", {
      _product_id: data.productId,
      _variant_id: data.variantId,
      _kind: data.kind,
      _quantity: data.quantity,
      _expected_before: data.expectedBefore,
      _reason: data.reason,
      _reference: data.reference ?? null,
    });
    if (error) throw new Error(error.message.replace(/^STALE:\s*/, ""));
    return result as { before: number; after: number; delta: number };
  });

export const adminSetReorderThreshold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; variantId: string | null; threshold: number }) => {
    if (!Number.isInteger(input.threshold) || input.threshold < 0 || input.threshold > 100000)
      throw new Error("Threshold must be a whole number from 0 to 100000");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const variantKey = skuKey(data.productId, data.variantId).split("::")[1] ?? "base";
    const { error } = await context.supabase.from("inventory_reorder_settings").upsert({
      product_id: data.productId,
      variant_key: variantKey,
      threshold: data.threshold,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  });
