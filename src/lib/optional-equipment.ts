import { normalizeCatalogueSection } from "./catalogue-sections";
import { effectiveStock, getProductOption, isComingSoon, stockState, variantStockFor, type Product } from "./products";
import type { CartItem } from "./cart";
import { flowPenLine, kitOfferSource, starterKitSlugFor } from "./pen-companion";
import { PEN_STARTER_KIT_SLUG, RANGE_STARTER_KIT_SLUG } from "./starter-kits";

/**
 * One Admin-chosen optional add-on. `variantIds: null` = every option of the
 * Equipment product; `parentVariantIds: null` = shown for every option of the
 * Range/Pen product. A saved list (even empty) replaces the built-in default.
 */
export type OptionalEquipmentEntry = {
  slug: string;
  variantIds: string[] | null;
  parentVariantIds: string[] | null;
  /** Range only: offered only while a V2 pen case is selected for this option. */
  whenPen?: boolean;
};

export const MAX_OPTIONAL_EQUIPMENT = 12;
const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

function idList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return [...new Set(raw.map((x) => String(x ?? "").trim()).filter((x) => ID_RE.test(x)))];
}

/** Shape-only parse of stored/posted data. Non-array → null (built-in default). */
export function sanitizeOptionalEquipment(raw: unknown): OptionalEquipmentEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const out: OptionalEquipmentEntry[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const e = r as { slug?: unknown; variantIds?: unknown; parentVariantIds?: unknown; whenPen?: unknown };
    const slug = String(e.slug ?? "").trim();
    if (!SLUG_RE.test(slug) || out.some((o) => o.slug === slug)) continue;
    const entry: OptionalEquipmentEntry = { slug, variantIds: idList(e.variantIds), parentVariantIds: idList(e.parentVariantIds) };
    if (e.whenPen === true) entry.whenPen = true;
    out.push(entry);
    if (out.length >= MAX_OPTIONAL_EQUIPMENT) break;
  }
  return out;
}

type CatalogueRow = { slug: string; catalogue_section?: unknown; product_variants?: unknown };

/**
 * Server-side save validation against stored catalogue rows: only Range/Pens
 * parents, only Equipment add-ons (never the product itself), only existing
 * variant IDs. Scoped selections that no longer match anything are dropped.
 */
export function validateOptionalEquipment(
  raw: unknown,
  parent: { slug: string; section: unknown; variantIds: string[] },
  rows: CatalogueRow[],
): OptionalEquipmentEntry[] | null {
  const list = sanitizeOptionalEquipment(raw);
  if (list === null) return null;
  const section = normalizeCatalogueSection(parent.section);
  if (section !== "range" && section !== "pens") return null;
  const out: OptionalEquipmentEntry[] = [];
  for (const e of list) {
    if (e.slug === parent.slug) continue;
    const row = rows.find((r) => r.slug === e.slug);
    if (!row || normalizeCatalogueSection(row.catalogue_section) !== "equipment") continue;
    const ids = (Array.isArray(row.product_variants) ? row.product_variants : [])
      .map((v) => String((v as { id?: unknown })?.id ?? ""))
      .filter(Boolean);
    let variantIds: string[] | null = null;
    if (ids.length && e.variantIds) {
      variantIds = e.variantIds.filter((id) => ids.includes(id));
      if (!variantIds.length) continue;
      if (variantIds.length === ids.length) variantIds = null;
    }
    let parentVariantIds: string[] | null = null;
    if (e.parentVariantIds && parent.variantIds.length) {
      parentVariantIds = e.parentVariantIds.filter((id) => parent.variantIds.includes(id));
      if (!parentVariantIds.length) continue;
      if (parentVariantIds.length === parent.variantIds.length) parentVariantIds = null;
    }
    const saved: OptionalEquipmentEntry = { slug: e.slug, variantIds, parentVariantIds };
    if (e.whenPen && section === "range") saved.whenPen = true;
    out.push(saved);
  }
  return out;
}

export type ResolvedEquipmentOption = {
  product: Product;
  /** Orderable variant IDs in display order; empty when the product has no variants. */
  variantIds: string[];
};

function isKit(p: Product | undefined): p is Product {
  return Boolean(p && normalizeCatalogueSection(p.catalogueSection) === "equipment");
}

/**
 * The add-ons a Range/Pen product offers for a chosen option. With no saved
 * list this is exactly the legacy starter-kit offer (including the switch to
 * the Pen Starter Kit while a flow-owned V2 pen is selected).
 */
export function optionalEquipmentFor(
  product: Product,
  products: Product[],
  items: CartItem[],
  parentVariantId?: string | null,
): ResolvedEquipmentOption[] {
  const section = normalizeCatalogueSection(product.catalogueSection);
  if (section !== "range" && section !== "pens") return [];
  const config = product.optionalEquipment ?? null;
  if (config === null) {
    if (product.starterKitEnabled === false) return [];
    const slug = starterKitSlugFor(product, items, parentVariantId);
    const kit = products.find((p) => p.slug === slug && p.catalogueSection === "equipment" && !p.variants?.length);
    return kit ? [{ product: kit, variantIds: [] }] : [];
  }
  const penSwitch = section === "range" && Boolean(flowPenLine(items, product.slug, parentVariantId));
  const out: ResolvedEquipmentOption[] = [];
  for (const entry of config) {
    if (entry.parentVariantIds && !entry.parentVariantIds.includes(parentVariantId || "")) continue;
    if (entry.whenPen && !penSwitch) continue;
    let slug = entry.slug;
    if (penSwitch && slug === RANGE_STARTER_KIT_SLUG && products.some((p) => p.slug === PEN_STARTER_KIT_SLUG)) {
      slug = PEN_STARTER_KIT_SLUG;
    }
    if (slug === product.slug || out.some((o) => o.product.slug === slug)) continue;
    const found = products.find((p) => p.slug === slug);
    if (!isKit(found)) continue;
    const all = (found.variants ?? []).map((v) => v.id);
    const variantIds = all.length ? (entry.variantIds ?? all).filter((id) => all.includes(id)) : [];
    if (all.length && !variantIds.length) continue;
    out.push({ product: found, variantIds });
  }
  return out;
}

/** The single offer-owned cart line for this parent option and add-on, if any. */
export function ownedEquipmentLine(
  items: CartItem[],
  parentSlug: string,
  parentVariantId: string | null | undefined,
  equipmentSlug: string,
): CartItem | null {
  const source = kitOfferSource(parentSlug, parentVariantId);
  return items.find((i) => i.source === source && i.slug === equipmentSlug) ?? null;
}

/** Whether one more unit of this add-on option can be added. */
export function equipmentOptionAvailability(kit: Product, variantId: string | null, items: CartItem[]) {
  const comingSoon = isComingSoon(kit, variantId);
  const stock = kit.variants?.length ? variantStockFor(kit, variantId) : effectiveStock(kit, kit.stock);
  const inCart = items
    .filter((i) => i.slug === kit.slug && (i.variantId ?? null) === (variantId ?? null))
    .reduce((s, i) => s + i.quantity, 0);
  // A $0 / unpriced item is still being set up and is never offered as purchasable.
  const unpriced = !(getProductOption(kit, variantId, "single").unitPrice > 0);
  const soldOut = stockState(stock) === "out" || unpriced;
  const atLimit = inCart >= 99 || (stock != null && inCart >= stock);
  return { comingSoon, soldOut, unpriced, canAdd: !comingSoon && !soldOut && !atLimit };
}
