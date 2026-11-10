import { EQUIPMENT_GIFTS_KEY, INACTIVE_GIFT_PRODUCTS_KEY, parseEquipmentGiftOffers } from "./equipment-gifts";
import { readWebsitePromotion, websiteSalePrice, parseWebsitePromotion, type WebsitePromotion } from "./website-promotion";
import { sanitizeOptionalEquipment } from "./optional-equipment";
import { optimizedProductImage } from "./product-image-delivery";
import { PROMOTION_BANNERS_KEY, parseBannerSettings, serialiseBannerSettings } from "@/lib/promotion-banners";
import { PEN_CASES_KEY, parsePenCases, serialisePenCases } from "@/lib/pen-cases";
import { sanitizeProductLinks } from "@/lib/product-certificates";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCatalogueSection, sanitizeExtraSections } from "@/lib/catalogue-sections";
import { isUnlimitedStock, sanitizeBundle, sanitizePackSize, catalogueVariantImage, type Product, type ProductLink, type ProductVariant } from "@/lib/products";

export type SiteLink = { id: string; label: string; url: string; sort_order: number };

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  return createClient<Database>(process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"], key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function toProduct(row: any): Product { return toProductWithPromotion(row, parseWebsitePromotion(undefined)); }

export function toProductWithPromotion(row: any, promotion: WebsitePromotion): Product {
  const unlimited = isUnlimitedStock(row);
  const links = sanitizeProductLinks(row.product_links);
  const rawVariants = Array.isArray(row.product_variants) ? row.product_variants : [];
  const optNum = (value: any) =>
    value === null || value === undefined || value === "" || Number.isNaN(Number(value))
      ? null
      : Number(value);
  const variants = rawVariants
    .map((v: any, index: number) => ({
      id: String(v?.id || `size-${index}`),
      label: String(v?.label || "").trim(),
      description: String(v?.description ?? "").trim().slice(0, 12000),
      price: Number(v?.price ?? 0),
      salePrice: (() => { const price = websiteSalePrice(Number(v?.price), optNum(v?.salePrice), row.id, promotion); return price < Number(v?.price) ? price : null; })(),
      promoLabel: String(v?.promoLabel ?? ""),
      hotProduct: typeof v?.hotProduct === "boolean" ? v.hotProduct : undefined,
      stock: unlimited ? null : v?.stock === null || v?.stock === undefined ? null : Math.max(0, Math.trunc(Number(v.stock) || 0)),
      comingSoon: Boolean(v?.comingSoon),
      reconVialMg: optNum(v?.reconVialMg),
      reconWaterMl: optNum(v?.reconWaterMl),
      reconDoseMg: optNum(v?.reconDoseMg),
      reconNotes: String(v?.reconNotes ?? ""),
      image: catalogueVariantImage(String(row.slug), row.image_url, v?.label, v?.image),
      contents: sanitizeBundle(v?.contents),
      packSize: normalizeCatalogueSection(row.catalogue_section) === "equipment" ? sanitizePackSize(v?.packSize) : 1,
    }))
    .filter((v: ProductVariant) => v.label && v.price > 0)
    .sort((a: ProductVariant, b: ProductVariant) => {
      const aSize = Number.parseFloat(a.label.replace(/[^0-9.]/g, ""));
      const bSize = Number.parseFloat(b.label.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(aSize) && Number.isFinite(bSize) && aSize !== bSize) return aSize - bSize;
      return a.price - b.price || a.label.localeCompare(b.label);
    });
  const listPrice = Number(row.price);
  const sale = websiteSalePrice(listPrice, row.sale_price == null ? null : Number(row.sale_price), row.id, promotion);
  const onSale = sale !== null && sale > 0 && sale < listPrice;
  return {
    ...(row.id ? { id: String(row.id) } : {}),
    slug: row.slug,
    name: row.slug === "luer-lock-syringe" && row.name === "3ml Luer Lock Syringe with drawing needle"
      ? "3ml Luer Lock Syringe with Safety Hypodermic Needle"
      : row.name,
    price: onSale ? (sale as number) : listPrice,
    wasPrice: onSale ? listPrice : null,
    promoLabel: row.promo_label ?? "",
    subDescription: String(row.sub_description ?? "").trim(),
    variants,
    image: optimizedProductImage(row.image_url),
    alt: row.alt || row.name,
    blurb: row.blurb ?? "",
    description: row.description ?? "",
    details: (row.details ?? []) as string[],
    categories: (row.categories ?? []) as string[],
    protocol: row.protocol ?? "",
    reconVialMg: row.recon_vial_mg === null || row.recon_vial_mg === undefined ? null : Number(row.recon_vial_mg),
    reconWaterMl: row.recon_water_ml === null || row.recon_water_ml === undefined ? null : Number(row.recon_water_ml),
    reconDoseMg: row.recon_dose_mg === null || row.recon_dose_mg === undefined ? null : Number(row.recon_dose_mg),
    reconNotes: row.recon_notes ?? "",
    unlimitedStock: unlimited,
    stock: unlimited ? null : row.stock_quantity === null || row.stock_quantity === undefined ? null : Number(row.stock_quantity),
    comingSoon: Boolean(row.coming_soon),
    catalogueSection: normalizeCatalogueSection(row.catalogue_section),
    extraSections: sanitizeExtraSections(row.extra_catalogue_sections, row.catalogue_section),
    starterKitEnabled: row.starter_kit_enabled !== false,
    optionalEquipment: sanitizeOptionalEquipment(row.optional_equipment),
    v2PenOfferEnabled: row.v2_pen_offer_enabled !== false,
    links: links.filter((l) => l && l.url),
  };
}

export const PRODUCT_COLUMNS =
  "id, slug, name, price, sale_price, promo_label, sub_description, product_variants, image_url, alt, blurb, description, details, categories, protocol, recon_vial_mg, recon_water_ml, recon_dose_mg, recon_notes, product_links, stock_quantity, coming_soon, catalogue_section, starter_kit_enabled, unlimited_stock, optional_equipment, v2_pen_offer_enabled, extra_catalogue_sections";

export const listProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Product[]> => {
    const client = publicClient();
    const [{ data, error }, promotion] = await Promise.all([client
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("active", true)
      .order("name", { ascending: true }), readWebsitePromotion(client)]);
    if (error) throw error;
    return (data ?? []).map(row => toProductWithPromotion(row, promotion));
  },
);

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<Product | null> => {
    const client = publicClient();
    const [{ data: row, error }, promotion] = await Promise.all([client
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle(), readWebsitePromotion(client)]);
    if (error) throw error;
    return row ? toProductWithPromotion(row, promotion) : null;
  });

export const listSiteLinks = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteLink[]> => {
    const { data, error } = await publicClient()
      .from("site_links")
      .select("id, label, url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as SiteLink[];
  },
);

/** Expose only presentation/availability for inactive options offered as gifts. */
async function inactiveGiftProducts(raw: string | undefined): Promise<Product[]> {
  if (raw === undefined) return [];
  const rules = parseEquipmentGiftOffers(raw).filter((rule) => rule.enabled);
  const slugs = [...new Set(rules.map((rule) => rule.giftSlug))];
  if (!slugs.length) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("products")
    .select("slug, name, price, image_url, alt, product_variants, catalogue_section, coming_soon, stock_quantity, unlimited_stock")
    .eq("active", false)
    .in("slug", slugs);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const variants = Array.isArray(row.product_variants) ? row.product_variants : [];
    const offeredIds = new Set(rules.filter((rule) => rule.giftSlug === row.slug).map((rule) => rule.giftVariantId));
    const offered = variants.filter((variant: any) => offeredIds.has(variant?.id));
    if (variants.length ? !offered.length : !offeredIds.has(null)) return [];
    return [toProduct({
      ...row,
      product_variants: offered.map((variant: any) => ({
        id: variant.id, label: variant.label, price: variant.price,
        image: variant.image, stock: variant.stock, comingSoon: variant.comingSoon, packSize: variant.packSize,
      })),
    })];
  });
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await publicClient().from("site_content").select("key, body");
    if (error) throw error;
    const out: Record<string, string> = {};
    for (const row of data ?? []) {
      const key = (row as any).key, body = (row as any).body ?? "";
      out[key] = key === PROMOTION_BANNERS_KEY ? serialiseBannerSettings(parseBannerSettings(body))
        : key === PEN_CASES_KEY ? serialisePenCases(parsePenCases(body)) : body;
    }
    // Gift metadata travels with the offer settings, never through catalogue or product-page queries.
    out[INACTIVE_GIFT_PRODUCTS_KEY] = JSON.stringify(await inactiveGiftProducts(out[EQUIPMENT_GIFTS_KEY]).catch(() => []));
    return out;
  },
);



