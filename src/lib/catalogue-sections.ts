/** Storefront sections (Range / Pens / Equipment) — separate from scientific categories. */
export const CATALOGUE_SECTIONS = ["range", "pens", "equipment"] as const;
export type CatalogueSection = (typeof CATALOGUE_SECTIONS)[number];
export const DEFAULT_CATALOGUE_SECTION: CatalogueSection = "range";

export const CATALOGUE_SECTION_LABELS: Record<CatalogueSection, string> = {
  range: "Range",
  pens: "Pens",
  equipment: "Equipment",
};

export function isCatalogueSection(value: unknown): value is CatalogueSection {
  return typeof value === "string" && (CATALOGUE_SECTIONS as readonly string[]).includes(value);
}

/** Unknown, missing or legacy values fall back to Range. */
export function normalizeCatalogueSection(value: unknown): CatalogueSection {
  const v = typeof value === "string" ? value.trim().toLowerCase() : value;
  return isCatalogueSection(v) ? v : DEFAULT_CATALOGUE_SECTION;
}

/** Strict server-side check: rejects anything that is not a known section. */
export function parseCatalogueSection(value: unknown): CatalogueSection {
  if (value === undefined || value === null || value === "") return DEFAULT_CATALOGUE_SECTION;
  const v = typeof value === "string" ? value.trim().toLowerCase() : value;
  if (!isCatalogueSection(v)) throw new Error("Invalid catalogue section");
  return v;
}

/** Additional listing sections (display only). Unknown values and the primary section are dropped. */
export function sanitizeExtraSections(raw: unknown, primary?: unknown): CatalogueSection[] {
  if (!Array.isArray(raw)) return [];
  const main = primary === undefined ? null : normalizeCatalogueSection(primary);
  const out: CatalogueSection[] = [];
  for (const r of raw) {
    const v = typeof r === "string" ? r.trim().toLowerCase() : r;
    if (isCatalogueSection(v) && v !== main && !out.includes(v)) out.push(v);
  }
  return out;
}

/** Whether a product is listed in a section: its primary section or any extra listing. */
export function listedInSection(
  item: { catalogueSection?: CatalogueSection | null; extraSections?: readonly CatalogueSection[] | null },
  section: CatalogueSection,
) {
  return normalizeCatalogueSection(item.catalogueSection) === section || (item.extraSections ?? []).includes(section);
}

/**
 * Products listed in a section. One product may appear in several sections
 * (shared variants, prices and stock); pricing rules always use its primary
 * `catalogueSection`, never the listing.
 */
export function filterBySection<T extends { catalogueSection?: CatalogueSection | null; extraSections?: readonly CatalogueSection[] | null }>(
  items: T[],
  section: CatalogueSection,
): T[] {
  return items.filter((item) => listedInSection(item, section));
}

export function resolveCatalogueSection(
  requested: unknown,
  available: readonly CatalogueSection[],
): CatalogueSection {
  if (isCatalogueSection(requested) && available.includes(requested)) return requested;
  return available[0] ?? DEFAULT_CATALOGUE_SECTION;
}
