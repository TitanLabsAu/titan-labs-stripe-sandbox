import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EQUIPMENT_GIFTS_KEY, isGiftCatalogueSection, parseEquipmentGiftOffers, validateEquipmentGiftOffers, validateGiftCatalogue, type EquipmentGiftRule } from "./equipment-gifts";

async function requireAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}
async function readSettings(db: any) {
  const { data, error } = await db.from("site_content").select("body").eq("key", EQUIPMENT_GIFTS_KEY).maybeSingle();
  if (error) throw error;
  const raw = data?.body ?? null;
  // Do not silently overwrite a damaged settings document during an Admin save.
  const rules = raw === null ? parseEquipmentGiftOffers(null) : validateEquipmentGiftOffers(JSON.parse(raw));
  return { raw: raw as string | null, rules };
}
export const adminGetEquipmentGifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    return readSettings(context.supabase);
  });
export const adminSaveEquipmentGifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productSlug: string; rules: EquipmentGiftRule[]; expectedRaw: string | null }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const incoming = validateEquipmentGiftOffers(data.rules);
    if (!data.productSlug || incoming.some(rule => rule.giftSlug !== data.productSlug)) throw new Error("Save offers for this product only.");
    const current = await readSettings(context.supabase);
    const conflict = "Free gift offers changed while you were editing. Reload offers before saving.";
    if (current.raw !== data.expectedRaw) throw new Error(conflict);
    const slugs = [...new Set([data.productSlug, ...incoming.flatMap(rule => rule.targets.map(t => t.slug))])];
    const { data: products, error: productError } = await context.supabase.from("products")
      .select("slug, catalogue_section, product_variants").in("slug", slugs);
    if (productError) throw productError;
    const bySlug = new Map((products ?? []).map((p: any) => [p.slug, { slug: p.slug, catalogueSection: p.catalogue_section, variants: p.product_variants ?? [] }]));
    if (!isGiftCatalogueSection((bySlug.get(data.productSlug) as any)?.catalogueSection)) throw new Error("Save this product in Range, Pens or Equipment before setting up free gifts.");
    validateGiftCatalogue(incoming, slug => bySlug.get(slug) as any);
    const rules = validateEquipmentGiftOffers([...current.rules.filter(rule => rule.giftSlug !== data.productSlug), ...incoming]);
    const body = JSON.stringify(rules);
    if (current.raw !== null) {
      const { data: changed, error } = await context.supabase.from("site_content").update({ body })
        .eq("key", EQUIPMENT_GIFTS_KEY).eq("body", current.raw).select("key");
      if (error) throw error;
      if (changed?.length !== 1) throw new Error(conflict);
    } else {
      const { error } = await context.supabase.from("site_content").insert({ key: EQUIPMENT_GIFTS_KEY, body });
      if (error?.code === "23505") throw new Error(conflict);
      if (error) throw error;
    }
    return { raw: body, rules };
  });

