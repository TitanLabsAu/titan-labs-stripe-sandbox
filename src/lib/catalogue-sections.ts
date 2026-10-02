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

export function filterBySection<T extends { catalogueSection?: CatalogueSection | null }>(
  items: T[],
  section: CatalogueSection,
): T[] {
  return items.filter((item) => normalizeCatalogueSection(item.catalogueSection) === section);
}
