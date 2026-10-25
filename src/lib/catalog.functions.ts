import { optimizedProductImage } from "./product-image-delivery";
import { sanitizeProductLinks } from "@/lib/product-certificates";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCatalogueSection } from "@/lib/catalogue-sections";
import { isUnlimitedStock, sanitizeBundle, sanitizePackSize, sanitizeVariantImage, type Product, type ProductLink, type ProductVariant } from "@/lib/products";

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

export function toProduct(row: any): Product {
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
      price: Number(v?.price ?? 0),
      salePrice: optNum(v?.salePrice),
      promoLabel: String(v?.promoLabel ?? ""),
      hotProduct: typeof v?.hotProduct === "boolean" ? v.hotProduct : undefined,
      stock: unlimited ? null : v?.stock === null || v?.stock === undefined ? null : Math.max(0, Math.trunc(Number(v.stock) || 0)),
      comingSoon: Boolean(v?.comingSoon),
      reconVialMg: optNum(v?.reconVialMg),
      reconWaterMl: optNum(v?.reconWaterMl),
      reconDoseMg: optNum(v?.reconDoseMg),
      reconNotes: String(v?.reconNotes ?? ""),
      image: sanitizeVariantImage(v?.image),
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
  const sale =
    row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price);
  const onSale = sale !== null && sale > 0 && sale < listPrice;
  return {
    slug: row.slug,
    name: row.name,
    price: onSale ? (sale as number) : listPrice,
    wasPrice: onSale ? listPrice : null,
    promoLabel: row.promo_label ?? "",
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
    starterKitEnabled: row.starter_kit_enabled !== false,
    links: links.filter((l) => l && l.url),
  };
}

export const PRODUCT_COLUMNS =
  "slug, name, price, sale_price, promo_label, product_variants, image_url, alt, blurb, description, details, categories, protocol, recon_vial_mg, recon_water_ml, recon_dose_mg, recon_notes, product_links, stock_quantity, coming_soon, catalogue_section, starter_kit_enabled, unlimited_stock";

export const listProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Product[]> => {
    const { data, error } = await publicClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toProduct);
  },
);

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<Product | null> => {
    const { data: row, error } = await publicClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return row ? toProduct(row) : null;
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

export const getSiteContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await publicClient().from("site_content").select("key, body");
    if (error) throw error;
    const out: Record<string, string> = {};
    for (const row of data ?? []) out[(row as any).key] = (row as any).key === PROMOTION_BANNERS_KEY ? serialiseBannerSettings(parseBannerSettings((row as any).body)) : (row as any).body ?? "";
    return out;
  },
);


