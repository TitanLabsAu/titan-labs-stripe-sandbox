import { normalizeCatalogueSection, type CatalogueSection } from "@/lib/catalogue-sections";
import { isUnlimitedStock, LOW_STOCK_THRESHOLD } from "@/lib/products";

/** One stock-keeping unit: a single size, or the product itself when it has no sizes. */
export type InventorySku = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  variantId: string | null;
  size: string;
  section: CatalogueSection;
  /** null when untracked (unlimited Equipment). */
  quantity: number | null;
  unlimited: boolean;
  active: boolean;
  comingSoon: boolean;
  unitCost: number | null;
  value: number | null;
  threshold: number;
  thresholdCustom: boolean;
  status: InventoryStatus;
  supportsKit: boolean;
};
export type InventoryStatus = "out" | "low" | "ok" | "untracked";

export type RawProduct = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  coming_soon?: boolean | null;
  stock_quantity: number | null;
  catalogue_section?: unknown;
  unlimited_stock?: boolean | null;
  product_variants?: unknown;
};

const whole = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};
const costOf = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function statusFor(quantity: number | null, threshold: number): InventoryStatus {
  if (quantity === null) return "untracked";
  if (quantity <= 0) return "out";
  if (quantity < threshold) return "low";
  return "ok";
}

export const skuKey = (productId: string, variantId: string | null) => `${productId}::${variantId ?? "base"}`;

/** Build one row per size (never parent + sizes) from authoritative product rows. */
export function buildSkus(products: RawProduct[], thresholds: Map<string, number>): InventorySku[] {
  const rows: InventorySku[] = [];
  for (const p of products) {
    const section = normalizeCatalogueSection(p.catalogue_section);
    const unlimited = isUnlimitedStock({ catalogue_section: section, unlimited_stock: p.unlimited_stock });
    const variants = Array.isArray(p.product_variants) ? (p.product_variants as any[]) : [];
    const entries =
      variants.length > 0
        ? variants.map((v) => ({
            variantId: String(v.id),
            size: String(v.label ?? ""),
            stock: whole(v.stock),
            cost: costOf(v.cost),
            comingSoon: Boolean(p.coming_soon) || Boolean(v.comingSoon),
          }))
        : [{ variantId: null, size: "", stock: whole(p.stock_quantity), cost: null, comingSoon: Boolean(p.coming_soon) }];
    for (const e of entries) {
      const key = skuKey(p.id, e.variantId);
      const custom = thresholds.get(key);
      const threshold = custom ?? LOW_STOCK_THRESHOLD;
      const quantity = unlimited ? null : e.stock;
      rows.push({
        key,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        variantId: e.variantId,
        size: e.size,
        section,
        quantity,
        unlimited,
        active: Boolean(p.active),
        comingSoon: e.comingSoon,
        unitCost: e.cost,
        value: quantity !== null && e.cost !== null ? quantity * e.cost : null,
        threshold,
        thresholdCustom: custom !== undefined,
        status: statusFor(quantity, threshold),
        supportsKit: section === "range",
      });
    }
  }
  return rows;
}

export type InventoryOverview = {
  trackedUnits: number;
  trackedSkus: number;
  stockedSkus: number;
  lowCount: number;
  outCount: number;
  untrackedSkus: number;
  valuedUnits: number;
  unpricedSkus: number;
  value: number;
  bySection: Record<CatalogueSection, { skus: number; units: number; low: number; out: number; untracked: number }>;
};

export function summarize(rows: InventorySku[]): InventoryOverview {
  const empty = () => ({ skus: 0, units: 0, low: 0, out: 0, untracked: 0 });
  const o: InventoryOverview = {
    trackedUnits: 0, trackedSkus: 0, stockedSkus: 0, lowCount: 0, outCount: 0, untrackedSkus: 0,
    valuedUnits: 0, unpricedSkus: 0, value: 0,
    bySection: { range: empty(), pens: empty(), equipment: empty() },
  };
  for (const r of rows) {
    const s = o.bySection[r.section];
    s.skus++;
    if (r.quantity === null) { o.untrackedSkus++; s.untracked++; continue; }
    o.trackedSkus++;
    o.trackedUnits += r.quantity;
    s.units += r.quantity;
    if (r.quantity > 0) o.stockedSkus++;
    if (r.status === "low") { o.lowCount++; s.low++; }
    if (r.status === "out") { o.outCount++; s.out++; }
    if (r.value !== null) { o.value += r.value; o.valuedUnits += r.quantity; }
    else o.unpricedSkus++;
  }
  return o;
}

export type InventoryFilters = {
  search: string;
  section: "all" | CatalogueSection;
  status: "all" | InventoryStatus | "attention";
  visibility: "all" | "active" | "hidden" | "coming_soon";
};
export type SortKey = "name" | "quantity" | "status" | "value" | "section";

const statusRank: Record<InventoryStatus, number> = { out: 0, low: 1, ok: 2, untracked: 3 };

export function filterSkus(rows: InventorySku[], f: InventoryFilters) {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && !`${r.name} ${r.size} ${r.slug}`.toLowerCase().includes(q)) return false;
    if (f.section !== "all" && r.section !== f.section) return false;
    if (f.status === "attention" ? !(r.status === "low" || r.status === "out") : f.status !== "all" && r.status !== f.status) return false;
    if (f.visibility === "active" && !r.active) return false;
    if (f.visibility === "hidden" && r.active) return false;
    if (f.visibility === "coming_soon" && !r.comingSoon) return false;
    return true;
  });
}

export function sortSkus(rows: InventorySku[], key: SortKey, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  const cmp = (a: InventorySku, b: InventorySku) => {
    switch (key) {
      case "quantity": return ((a.quantity ?? Infinity) - (b.quantity ?? Infinity)) || 0;
      case "status": return statusRank[a.status] - statusRank[b.status];
      case "value": return (a.value ?? -1) - (b.value ?? -1);
      case "section": return a.section.localeCompare(b.section);
      default: return 0;
    }
  };
  return [...rows].sort((a, b) => cmp(a, b) * m || a.name.localeCompare(b.name) || a.size.localeCompare(b.size, undefined, { numeric: true }));
}

/** Low/out SKUs ordered by urgency, with units needed to reach the threshold. */
export function lowStockAlerts(rows: InventorySku[]) {
  return rows
    .filter((r) => r.quantity !== null && (r.status === "low" || r.status === "out"))
    .map((r) => ({ ...r, replenish: Math.max(0, r.threshold - (r.quantity ?? 0)) }))
    .sort((a, b) => (a.quantity! / Math.max(1, a.threshold)) - (b.quantity! / Math.max(1, b.threshold)) || b.replenish - a.replenish);
}

export type AdjustKind = "receive" | "remove" | "count";

/** Validates an adjustment and previews before/delta/after; mirrors the database rules. */
export function previewAdjustment(before: number, kind: AdjustKind, raw: string, reason: string) {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { ok: false as const, error: "Enter a whole number of units." };
  const qty = Number(text);
  if (qty > 100000) return { ok: false as const, error: "That number is too large." };
  if (kind !== "count" && qty === 0) return { ok: false as const, error: "Quantity must be greater than zero." };
  const after = kind === "receive" ? before + qty : kind === "remove" ? before - qty : qty;
  if (after < 0) return { ok: false as const, error: `Only ${before} on hand; stock can't go below zero.` };
  if (after === before) return { ok: false as const, error: "That would not change the stock." };
  if (!reason.trim()) return { ok: false as const, error: "A reason is required." };
  return { ok: true as const, qty, before, after, delta: after - before };
}

/** CSV cell: quotes, doubles quotes and neutralises spreadsheet formulas. */
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function skusToCsv(rows: InventorySku[]) {
  const head = ["Product", "Size", "Section", "Quantity", "Status", "Visibility", "Coming soon", "Unlimited", "Unit cost", "Value", "Reorder threshold"];
  const lines = rows.map((r) =>
    [r.name, r.size, r.section, r.quantity ?? "Untracked", r.status, r.active ? "Active" : "Hidden", r.comingSoon ? "Yes" : "No",
      r.unlimited ? "Yes" : "No", r.unitCost ?? "", r.value ?? "", r.threshold].map(csvCell).join(","),
  );
  return [head.map(csvCell).join(","), ...lines].join("\r\n");
}
