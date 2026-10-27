import { z } from "zod";
import { normalizeCatalogueSection } from "./catalogue-sections";
import { isComingSoon, stockState, variantStockFor, type Product } from "./products";
import { V2_PEN_SLUG } from "./pen-companion";

/**
 * Editable V2 pen case choices for the Range "Add V2 Reusable Pen" offer.
 * Each case maps to a real catalogue product and an ordered list of its
 * colour variants; price, stock and photos always come from that product.
 * A case with no valid product is shown as unavailable, never purchasable.
 */
export const PEN_CASES_KEY = "pen_case_options";

export type PenCase = {
  id: string;
  name: string;
  productSlug: string | null;
  /** Ordered colour variant IDs; null = every variant (Blue/Purple/Grey order). */
  variantIds: string[] | null;
  active: boolean;
};
export type PenCaseSettings = { cases: PenCase[] };

export const DEFAULT_PEN_CASES: PenCase[] = [
  { id: "hard", name: "Titan Case - Hard Case", productSlug: V2_PEN_SLUG, variantIds: null, active: true },
  { id: "travel", name: "Travel Case - Soft Case", productSlug: null, variantIds: null, active: true },
];

const caseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(1).max(60),
  productSlug: z.string().regex(/^[a-z0-9-]{1,120}$/).nullable(),
  variantIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,120}$/)).max(20).nullable(),
  active: z.boolean(),
}).strict();
export const penCaseSettingsSchema = z.object({ cases: z.array(caseSchema).min(1).max(6) }).strict()
  .superRefine((s, ctx) => {
    const ids = new Set<string>();
    for (const c of s.cases) {
      if (ids.has(c.id)) ctx.addIssue({ code: "custom", message: "Case IDs must be unique" });
      ids.add(c.id);
    }
  });

export function parsePenCases(raw?: string): PenCaseSettings {
  try { return penCaseSettingsSchema.parse(JSON.parse(raw ?? "")); } catch { return { cases: DEFAULT_PEN_CASES }; }
}
export function serialisePenCases(settings: unknown) {
  const s = penCaseSettingsSchema.parse(settings);
  return JSON.stringify({ cases: s.cases.map((c) => ({ ...c, variantIds: c.variantIds ? [...new Set(c.variantIds)] : null })) });
}

const COLOUR_ORDER = ["blue", "purple", "grey"];
function colourRank(label: string) {
  const i = COLOUR_ORDER.indexOf(label.trim().toLowerCase());
  return i < 0 ? COLOUR_ORDER.length : i;
}

export type ResolvedCaseColour = { id: string; label: string; price: number; soldOut: boolean; comingSoon: boolean };
export type ResolvedPenCase = {
  id: string;
  name: string;
  product: Product | null;
  colours: ResolvedCaseColour[];
  /** True only when a real product with a positive price and an orderable colour exists. */
  available: boolean;
  status: "available" | "sold-out" | "pending-setup";
};

function unitPrice(v: { price: number; salePrice?: number | null }) {
  return v.salePrice != null && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price;
}

/** Active cases in saved order, each resolved against live catalogue products. */
export function resolvePenCases(settings: PenCaseSettings, products: Product[]): ResolvedPenCase[] {
  return settings.cases.filter((c) => c.active).map((c) => {
    const p = c.productSlug ? products.find((x) => x.slug === c.productSlug) : undefined;
    const section = p ? normalizeCatalogueSection(p.catalogueSection) : null;
    const valid = p && (section === "pens" || section === "equipment") && (p.variants ?? []).length > 0;
    if (!valid) return { id: c.id, name: c.name, product: null, colours: [], available: false, status: "pending-setup" as const };
    const all = p.variants ?? [];
    const ordered = c.variantIds
      ? c.variantIds.map((id) => all.find((v) => v.id === id)).filter((v): v is NonNullable<typeof v> => Boolean(v))
      : [...all].sort((a, b) => colourRank(a.label) - colourRank(b.label));
    const colours = ordered
      .map((v) => ({
        id: v.id,
        label: v.label,
        price: unitPrice(v),
        soldOut: stockState(variantStockFor(p, v.id)) === "out",
        comingSoon: isComingSoon(p, v.id),
      }))
      .filter((v) => v.price > 0);
    if (!colours.length) return { id: c.id, name: c.name, product: null, colours: [], available: false, status: "pending-setup" as const };
    const any = colours.some((v) => !v.soldOut && !v.comingSoon);
    return { id: c.id, name: c.name, product: p, colours, available: any, status: any ? "available" as const : "sold-out" as const };
  });
}

/** The case a cart line belongs to (by product + colour), if any. */
export function caseForLine(cases: ResolvedPenCase[], slug: string, variantId: string | null | undefined) {
  return cases.find((c) => c.product?.slug === slug && c.colours.some((v) => v.id === variantId)) ?? null;
}

/** Whether a colour may be added right now. */
export function canChooseColour(c: ResolvedPenCase, variantId: string) {
  const v = c.colours.find((x) => x.id === variantId);
  return Boolean(c.product && v && !v.soldOut && !v.comingSoon);
}

type StoredRow = { slug: string; catalogue_section?: unknown; product_variants?: unknown };

/**
 * Server save check against stored catalogue rows: a case may only point at a
 * Pens/Equipment product with colour variants, and only at its real variant
 * IDs. An invalid mapping is saved as "pending setup" (no product), never as
 * a purchasable option.
 */
export function validatePenCasesAgainst(settings: PenCaseSettings, rows: StoredRow[]): PenCaseSettings {
  return {
    cases: settings.cases.map((c) => {
      const row = c.productSlug ? rows.find((r) => r.slug === c.productSlug) : undefined;
      const section = row ? normalizeCatalogueSection(row.catalogue_section) : null;
      const ids = (Array.isArray(row?.product_variants) ? row!.product_variants as unknown[] : [])
        .map((v) => String((v as { id?: unknown })?.id ?? "")).filter(Boolean);
      if (!row || (section !== "pens" && section !== "equipment") || !ids.length) return { ...c, productSlug: null, variantIds: null };
      if (!c.variantIds) return c;
      const kept = c.variantIds.filter((id) => ids.includes(id));
      return { ...c, variantIds: kept.length ? kept : null };
    }),
  };
}
