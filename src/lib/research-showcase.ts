import type { ResearchEntry } from "./research";
import data from "./research-showcase.data.json";
import { EXCLUDED_SUBJECTIVE_LABELS } from "./research-subjective-ratings";

/** Owner-supplied card reference: descriptor/formula and first three source metrics only. Provenance internal. */
type CardSource = { slug: string; name: string; descriptorOrFormula: string | null; firstThreeSourceMetrics: { label: string; value: number }[] };
export const SHOWCASE_SOURCES = (data as { entries: CardSource[] }).entries;
const excluded = new Set<string>(EXCLUDED_SUBJECTIVE_LABELS);

/** Exact slug, published, and unique among published entries; otherwise nothing is shown. */
function cardSource(entry: ResearchEntry, entries: ResearchEntry[]) {
  if (!entry.published) return undefined;
  const source = SHOWCASE_SOURCES.find(row => row.slug === entry.slug);
  if (!source) return undefined;
  const published = entries.filter(row => row.published && row.slug === entry.slug);
  if (entries.length && (published.length !== 1 || published[0]?.id !== entry.id)) return undefined;
  return source;
}

/** Exact first three source cells with existing exclusions applied; never backfilled or substituted with counts. */
export function researchShowcaseStats(entry: ResearchEntry, entries: ResearchEntry[]) {
  return (cardSource(entry, entries)?.firstThreeSourceMetrics ?? [])
    .filter(metric => !excluded.has(metric.label))
    .map(metric => ({ val: metric.value, label: (metric.label.split(" ")[0] ?? "").toUpperCase().slice(0, 6), fullLabel: metric.label }));
}

const FORMULA = /^C\d+H\d+/;
export function researchShowcaseDescriptor(entry: ResearchEntry, entries: ResearchEntry[] = []): { kind: "descriptor" | "formula"; text: string } | undefined {
  const text = cardSource(entry, entries)?.descriptorOrFormula?.trim();
  if (text) return { kind: FORMULA.test(text) ? "formula" : "descriptor", text };
  return entry.molecular_formula ? { kind: "formula", text: entry.molecular_formula } : undefined;
}
