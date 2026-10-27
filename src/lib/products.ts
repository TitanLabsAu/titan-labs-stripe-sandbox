import { promotedPrice } from "@/lib/variant-promotions";
import { normalizeCatalogueSection, type CatalogueSection } from "@/lib/catalogue-sections";
import klow80 from "@/assets/klow80.asset.json";
import wolverine from "@/assets/wolverine.asset.json";
import nad1000 from "@/assets/nad1000.asset.json";

export type ProductLink = { label: string; url: string; kind?: "coa" | "document" | undefined; variantId?: string; strength?: string; batch?: string };
export type ProductVariant = {
  salePrice?: number | null;
  promoLabel?: string;
  hotProduct?: boolean;

  id: string;
  label: string;
  price: number;
  kitPrice?: number | null;
  /** Units on hand for this vial size. null = not tracked. */
  stock?: number | null;
  /** This size is coming soon and cannot be ordered yet. */
  comingSoon?: boolean;
  reconVialMg?: number | null;
  reconWaterMl?: number | null;
  reconDoseMg?: number | null;
  reconNotes?: string;
  /** Optional photo for this exact option; empty falls back to the product's main photo. */
  image?: string | null;
  /** Equipment bundles: display-only contents snapshot chosen by Admin. */
  contents?: BundleItem[];
  /** Equipment only: items in one sellable pack (default 1). Price/stock are per pack. */
  packSize?: number;
};

/** Optional per-variant photo URL; only safe http(s) or site-relative paths survive. */
export function sanitizeVariantImage(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/[\u0000-\u001f\u007f\s\\<>"'`]/.test(s)) return null;
  if (s.startsWith("/")) return s.startsWith("//") ? null : s.slice(0, 500);
  if (!/^https?:\/\/[^/]/i.test(s)) return null;
  return s.slice(0, 500);
}

/** Photo for the selected option: its own assigned image, else the product's main photo. */
export function variantImageFor(
  product: { image?: string | null; variants?: { id: string; image?: string | null }[] },
  variantId?: string | null,
) {
  const v = (product.variants ?? []).find((x) => x.id === variantId);
  return (v?.image && String(v.image)) || product.image || "";
}
export type ProductPack = "single" | "kit";
export type BundleItem = { slug: string; name: string; quantity: number };

/** Sanitize untrusted bundle contents (max 20 rows, qty 1–99). */
export function sanitizeBundle(raw: unknown): BundleItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      slug: String(r?.slug ?? "").trim().slice(0, 120),
      name: String(r?.name ?? "").trim().slice(0, 160),
      quantity: Math.min(99, Math.max(1, Math.trunc(Number(r?.quantity)) || 1)),
    }))
    .filter((r) => r.name)
    .slice(0, 20);
}

export function bundleSummary(items?: BundleItem[] | null) {
  return (items ?? []).map((i) => `${i.quantity} x ${i.name}`).join(", ");
}

export const MAX_PACK_SIZE = 1000;

/** Trusted-data read: invalid or missing values fall back to the legacy single item. */
export function sanitizePackSize(raw: unknown): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PACK_SIZE ? n : 1;
}

export function isValidPackSizeInput(raw: unknown): boolean {
  const t = String(raw ?? "").trim();
  if (t === "") return true; // blank = 1
  return /^\d+$/.test(t) && Number(t) >= 1 && Number(t) <= MAX_PACK_SIZE;
}

/** Admin save: reject (never silently fix) invalid pack sizes. */
export function parsePackSizeInput(raw: unknown, label = "this option"): number {
  if (!isValidPackSizeInput(raw))
    throw new Error(`Items per pack for ${label || "this option"} must be a whole number from 1 to ${MAX_PACK_SIZE}.`);
  const t = String(raw ?? "").trim();
  return t === "" ? 1 : Number(t);
}

/** Option label with its pack quantity, without duplicating a leading "10 x" already in the name. */
export function packLabel(label: string, packSize?: number | null) {
  const n = sanitizePackSize(packSize);
  if (n <= 1) return label;
  // Normalise any existing leading "N x" to the saved pack size (exactly one prefix).
  const rest = label.replace(/^\s*\d+\s*[x×]\s*/i, "");
  return `${n} x ${rest}`;
}

export type Product = {
  slug: string;
  name: string;
  /** Price the customer pays (already the sale price when one is set). */
  price: number;
  /** Original price, present only when the product is on sale. */
  wasPrice?: number | null;
  promoLabel?: string;
  /** Optional Admin subtitle; empty/whitespace renders nothing. */
  subDescription?: string;
  kitPrice?: number | null;
  variants?: ProductVariant[];
  image: string;
  alt: string;
  blurb: string;
  description?: string;
  details: string[];
  categories?: string[];
  protocol?: string;
  reconVialMg?: number | null;
  reconWaterMl?: number | null;
  reconDoseMg?: number | null;
  reconNotes?: string;
  links?: ProductLink[];
  /** Units on hand. null = not tracked. */
  stock?: number | null;
  /** Shown with a Coming Soon banner; cannot be ordered yet. */
  comingSoon?: boolean;
  /** Storefront section: range, pens or equipment. */
  catalogueSection?: CatalogueSection;
  /** Disable the universal starter-kit offer for this product. */
  starterKitEnabled?: boolean;
  /** Admin-chosen ordered add-ons; null/undefined keeps the built-in starter-kit default. */
  optionalEquipment?: import("./optional-equipment").OptionalEquipmentEntry[] | null;
  /** Range only: show the "Add V2 Reusable Pen" offer (default on). */
  v2PenOfferEnabled?: boolean;
  /** Equipment only: quantity is not tracked (server-derived, never trusted from a client). */
  unlimitedStock?: boolean;
};

/** True when the whole product, or the chosen vial size, is coming soon. */
export function isComingSoon(product: Product, variantId?: string | null) {
  if (product.comingSoon) return true;
  const v = (product.variants ?? []).find((x) => x.id === variantId);
  return Boolean(v?.comingSoon);
}

/** True when the product, or every one of its vial sizes, is coming soon. */
export function allComingSoon(product: Product) {
  if (product.comingSoon) return true;
  const vs = product.variants ?? [];
  return vs.length > 0 && vs.every((v) => v.comingSoon);
}

/**
 * The 10x bulk-kit feature is retired: every product sells as single items only.
 * Kept as a coercion point so stale cart lines and crafted requests degrade to "single".
 */
export function effectivePack(
  _product: { catalogueSection?: unknown; catalogue_section?: unknown },
  _pack: unknown,
): ProductPack {
  return "single";
}

/**
 * Single rule for untracked inventory: only Equipment can be unlimited.
 * Accepts both catalogue rows and storefront products so every path agrees.
 */
export function isUnlimitedStock(product: {
  catalogueSection?: unknown;
  catalogue_section?: unknown;
  unlimitedStock?: unknown;
  unlimited_stock?: unknown;
}) {
  const flag = product.unlimitedStock ?? product.unlimited_stock;
  return flag === true && normalizeCatalogueSection(product.catalogueSection ?? product.catalogue_section) === "equipment";
}

/** Effective stock for limit checks: null (untracked) for unlimited Equipment. */
export function effectiveStock(
  product: Parameters<typeof isUnlimitedStock>[0],
  stock: number | null | undefined,
): number | null {
  if (isUnlimitedStock(product)) return null;
  return stock == null ? null : Number(stock);
}

/** Label for the size picker / single option, generic for Equipment. */
export function sizeLabelFor(product: { catalogueSection?: unknown }) {
  return normalizeCatalogueSection(product.catalogueSection) === "range" ? "Vial size" : "Size";
}
export function singleLabelFor(product: { catalogueSection?: unknown }) {
  const section = normalizeCatalogueSection(product.catalogueSection);
  return section === "pens" ? "Pre-filled Pen Only" : section === "range" ? "Single vial" : "Single item";
}

/** Display-only subtitle; never used for cart/order line labels. */
export function subDescriptionFor(product: { subDescription?: unknown }) {
  return typeof product.subDescription === "string" ? product.subDescription.trim() : "";
}

export const LOW_STOCK_THRESHOLD = 7;

/** "out" = nothing left, "low" = under the low-stock threshold, "ok" = plenty (or untracked). */
export function stockState(stock?: number | null): "out" | "low" | "ok" {
  if (stock === null || stock === undefined) return "ok";
  if (stock <= 0) return "out";
  if (stock < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

/** Units on hand for a given vial size, falling back to the product-wide count. */
export function variantStockFor(product: Product, variantId?: string | null) {
  if (isUnlimitedStock(product)) return null;
  const variants = product.variants ?? [];
  if (variants.length === 0) return product.stock ?? null;
  const variant = variants.find((v) => v.id === variantId) ?? null;
  if (!variant) return product.stock ?? null;
  return variant.stock ?? null;
}

/** Units on hand across every vial size (or the product-wide count when no sizes exist). */
export function totalStockFor(product: Product) {
  if (isUnlimitedStock(product)) return null;
  const variants = product.variants ?? [];
  if (variants.length === 0) return product.stock ?? null;
  return variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock ?? 0)), 0);
}

export const products: Product[] = [
  {
    slug: "klow-80mg",
    name: "KLOW 80mg",
    price: 140,
    image: klow80.url,
    alt: "KLOW 80mg vials by Titan Labs",
    blurb:
      "A premium blended 80mg vial, batch tested for purity and shipped discreetly across Australia.",
    details: ["80mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
  {
    slug: "nad",
    name: "NAD+ 1000mg",
    price: 120,
    image: nad1000.url,
    alt: "NAD+ 1000mg vials by Titan Labs",
    blurb: "High strength 1000mg NAD+ for wellness research protocols.",
    details: ["1000mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
  {
    slug: "wolverine-20mg",
    name: "Wolverine 20mg",
    price: 120,
    image: wolverine.url,
    alt: "Wolverine 20mg vials by Titan Labs",
    blurb: "Our recovery favourite. 20mg per vial, pure form, research use only.",
    details: ["20mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

export function cartLineKey(slug: string, variantId?: string | null, pack: ProductPack = "single") {
  return [slug, variantId || "base", pack].join("::");
}

export function getProductOption(
  product: Product,
  variantId?: string | null,
  requestedPack: ProductPack = "single",
) {
  const pack = effectivePack(product, requestedPack);
  const variant = (product.variants ?? []).find((v) => v.id === variantId) ?? null;
  const unitPrice = variant ? promotedPrice(variant.price, variant.salePrice) : product.price;
  const variantLabel = variant ? packLabel(variant.label, variant.packSize) : singleLabelFor(product);
  return {
    key: cartLineKey(product.slug, variant?.id ?? null, pack),
    variantId: variant?.id ?? null,
    variantLabel,
    pack,
    unitPrice,
    stock: effectiveStock(product, variant ? (variant.stock ?? null) : (product.stock ?? null)),
    label: variantLabel,
  };
}

export function sortedProductVariants(product: Product) {
  const size = (label: string) => Number.parseFloat(label.replace(/[^0-9.]/g, ""));
  return [...(product.variants ?? [])].sort((a, b) => {
    const aSize = size(a.label);
    const bSize = size(b.label);
    if (Number.isFinite(aSize) && Number.isFinite(bSize) && aSize !== bSize) return aSize - bSize;
    return a.price - b.price || a.label.localeCompare(b.label);
  });
}

/** First vial size a customer can actually order (in stock, not coming soon).
 *  Falls back to the first size when every size is unavailable. */
export function firstAvailableVariant(product: Product) {
  const variants = sortedProductVariants(product);
  if (variants.length === 0) return null;
  return (
    variants.find((v) => !v.comingSoon && stockState(variantStockFor(product, v.id)) !== "out") ?? variants[0]
  );
}

export function productBasePrice(product: Product) {
  const variantPrices = (product.variants ?? []).map((v) => promotedPrice(v.price, v.salePrice)).filter((price) => price > 0);
  return variantPrices.length > 0 ? Math.min(...variantPrices) : product.price;
}

export function hasVariantPricing(product: Product) {
  return (product.variants ?? []).length > 0;
}

/** Reconstitution numbers for the selected vial size, falling back to the product defaults. */
export function getReconFor(product: Product, variantId?: string | null) {
  const variant = (product.variants ?? []).find((v) => v.id === variantId) ?? null;
  const pick = (a: number | null | undefined, b: number | null | undefined) =>
    a != null && !Number.isNaN(Number(a)) ? Number(a) : b != null ? Number(b) : null;
  return {
    vialMg: pick(variant?.reconVialMg, product.reconVialMg),
    waterMl: pick(variant?.reconWaterMl, product.reconWaterMl),
    doseMg: pick(variant?.reconDoseMg, product.reconDoseMg),
    notes: (variant?.reconNotes || product.reconNotes || "").trim(),
  };
}

