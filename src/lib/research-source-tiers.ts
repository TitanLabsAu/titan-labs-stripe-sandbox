import data from "./research-source-tiers.data.json";
import type { ResearchEntry } from "./research";

/** Owner-supplied subjective source tiers (S/A/B/C), shown verbatim; never derived from scores. No rarity/star rule exists in the source. */
export type SourceTier = "S" | "A" | "B" | "C";
export const SOURCE_TIERS = (data as { entries: { slug: string; name: string; tier: SourceTier }[] }).entries;
const exact = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
const matches = (entry: ResearchEntry, s: { slug: string; name: string }) =>
  entry.slug === s.slug || [entry.title, ...entry.synonyms].some(v => exact(v) === exact(s.name));

/** Published, exactly one source and exactly one published destination; otherwise nothing. */
export function researchSourceTier(entry: ResearchEntry, entries: ResearchEntry[]): SourceTier | undefined {
  if (!entry.published) return undefined;
  const c = SOURCE_TIERS.filter(s => matches(entry, s));
  if (c.length !== 1 || !c[0]) return undefined;
  const dest = entries.filter(r => r.published && matches(r, c[0]!));
  if (dest.length !== 1 || dest[0]?.id !== entry.id) return undefined;
  return c[0].tier;
}
