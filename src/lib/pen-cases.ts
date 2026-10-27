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
  /**
   * Optional separate pen product. When set, the case is a pair: the customer
   * picks a pen colour (this product) and a case colour (`productSlug`), and
   * two linked exact-variant cart lines are added. Null = the case product is
   * itself the pen (e.g. the Titan Case hard-case pen product).
   */
  penSlug?: string | null;
  /** Ordered pen colour variant IDs for a paired case; null = all variants. */
  penVariantIds?: string[] | null;
};
export type PenCaseSettings = { cases: PenCase[] };

export const DEFAULT_PEN_CASES: PenCase[] = [
  { id: "hard", name: "Titan Case - Hard Case", productSlug: V2_PEN_SLUG, variantIds: null, active: true },
  {
    id: "travel", name: "Travel Case - Soft Case", productSlug: "travel-case-with-ice-pack", variantIds: null, active: true,
    penSlug: "titan-v2-reusable-pen", penVariantIds: null,
  },
];

const caseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(1).max(60),
  productSlug: z.string().regex(/^[a-z0-9-]{1,120}$/).nullable(),
  variantIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,120}$/)).max(20).nullable(),
  active: z.boolean(),
  penSlug: z.string().regex(/^[a-z0-9-]{1,120}$/).nullable().optional(),
  penVariantIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,120}$/)).max(20).nullable().optional(),
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
  return JSON.stringify({ cases: s.cases.map((c) => ({ ...c, variantIds: c.variantIds ? [...new Set(c.variantIds)] : null,
    penSlug: c.penSlug ?? null, penVariantIds: c.penSlug && c.penVariantIds ? [...new Set(c.penVariantIds)] : null })) });
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
  /** The case product (for a non-paired case this product is also the pen). */
  product: Product | null;
  colours: ResolvedCaseColour[];
  /** Paired case only: the separate pen product and its colours. */
  pen: { product: Product; colours: ResolvedCaseColour[] } | null;
  /** True when this case is a pen + case pair (two linked cart lines). */
  paired: boolean;
  /** True only when a real product with a positive price and an orderable colour exists. */
  available: boolean;
  status: "available" | "sold-out" | "pending-setup";
};

function unitPrice(v: { price: number; salePrice?: number | null }) {
  return v.salePrice != null && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price;
}

function resolveColours(p: Product, ids: string[] | null | undefined): ResolvedCaseColour[] {
  const all = p.variants ?? [];
  const ordered = ids
    ? ids.map((id) => all.find((v) => v.id === id)).filter((v): v is NonNullable<typeof v> => Boolean(v))
    : [...all].sort((a, b) => colourRank(a.label) - colourRank(b.label));
  return ordered
    .map((v) => ({
      id: v.id,
      label: v.label,
      price: unitPrice(v),
      soldOut: stockState(variantStockFor(p, v.id)) === "out",
      comingSoon: isComingSoon(p, v.id),
    }))
    .filter((v) => v.price > 0);
}

function validFor(p: Product | undefined, sections: string[]): p is Product {
  return Boolean(p && sections.includes(normalizeCatalogueSection(p.catalogueSection)) && (p.variants ?? []).length > 0);
}
const orderable = (cs: ResolvedCaseColour[]) => cs.some((v) => !v.soldOut && !v.comingSoon);

/** Active cases in saved order, each resolved against live catalogue products. */
export function resolvePenCases(settings: PenCaseSettings, products: Product[]): ResolvedPenCase[] {
  return settings.cases.filter((c) => c.active).map((c) => {
    const paired = Boolean(c.penSlug);
    const pending = { id: c.id, name: c.name, product: null, colours: [], pen: null, paired, available: false, status: "pending-setup" as const };
    const p = c.productSlug ? products.find((x) => x.slug === c.productSlug) : undefined;
    if (!validFor(p, ["pens", "equipment"])) return pending;
    const colours = resolveColours(p, c.variantIds);
    if (!colours.length) return pending;
    let pen: ResolvedPenCase["pen"] = null;
    if (paired) {
      const pp = products.find((x) => x.slug === c.penSlug);
      if (!validFor(pp, ["pens"]) || pp.slug === p.slug) return pending;
      const penColours = resolveColours(pp, c.penVariantIds);
      if (!penColours.length) return pending;
      pen = { product: pp, colours: penColours };
    }
    const any = orderable(colours) && (!pen || orderable(pen.colours));
    return { id: c.id, name: c.name, product: p, colours, pen, paired, available: any, status: any ? "available" as const : "sold-out" as const };
  });
}

/** Lowest total a customer pays for this case (pen + case for a pair). */
export function caseFromPrice(c: ResolvedPenCase): number | null {
  if (!c.colours.length) return null;
  const min = (cs: ResolvedCaseColour[]) => Math.min(...cs.map((v) => v.price));
  return min(c.colours) + (c.pen ? min(c.pen.colours) : 0);
}

/** The case a cart line belongs to (by product + colour), if any. */
export function caseForLine(cases: ResolvedPenCase[], slug: string, variantId: string | null | undefined) {
  return cases.find((c) => {
    const pen = c.pen ?? (c.product ? { product: c.product, colours: c.colours } : null);
    return pen?.product.slug === slug && pen.colours.some((v) => v.id === variantId);
  }) ?? null;
}

/** Whether a paired case's pen colour may be added right now. */
export function canChoosePenColour(c: ResolvedPenCase, variantId: string) {
  const v = c.pen?.colours.find((x) => x.id === variantId);
  return Boolean(c.pen && v && !v.soldOut && !v.comingSoon);
}

/** Whether a colour may be added right now. */
export function canChooseColour(c: ResolvedPenCase, variantId: string) {
  const v = c.colours.find((x) => x.id === variantId);
  return Boolean(c.product && v && !v.soldOut && !v.comingSoon);
}

type StoredRow = { slug: string; catalogue_section?: unknown; product_variants?: unknown };
function variantIdsOf(row: StoredRow | undefined) {
  return (Array.isArray(row?.product_variants) ? row!.product_variants as unknown[] : [])
    .map((v) => String((v as { id?: unknown })?.id ?? "")).filter(Boolean);
}

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
      let out: PenCase = c;
      if (c.variantIds) {
        const kept = c.variantIds.filter((id) => ids.includes(id));
        out = { ...out, variantIds: kept.length ? kept : null };
      }
      if (c.penSlug) {
        const pen = rows.find((r) => r.slug === c.penSlug);
        const penIds = variantIdsOf(pen);
        if (!pen || pen.slug === row.slug || normalizeCatalogueSection(pen.catalogue_section) !== "pens" || !penIds.length) {
          // A pair whose pen is invalid is saved as pending setup, never as case-only.
          return { ...out, productSlug: null, variantIds: null, penSlug: null, penVariantIds: null };
        }
        const kept = (c.penVariantIds ?? []).filter((id) => penIds.includes(id));
        out = { ...out, penVariantIds: c.penVariantIds && kept.length ? kept : null };
      }
      return out;
    }),
  };
}
