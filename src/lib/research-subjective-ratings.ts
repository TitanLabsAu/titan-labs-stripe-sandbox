import data from "./research-subjective-ratings.data.json";
import type { ResearchEntry } from "./research";

/** Separate publisher opinions; never mapped to saved evidence or protocol fields. */
export const SUBJECTIVE_RATINGS = data.ratings;
export const EXCLUDED_SUBJECTIVE_LABELS = [
  "Beginner-Friendly", "Safety Profile", "Blood Sugar Safety",
  "Side-Effect Profile", "Side-Effect Severity", "Gentleness", "UV Protection",
  "Works for M & F", "Convenience", "Ease of Use",
] as const;
const excluded = new Set<string>(EXCLUDED_SUBJECTIVE_LABELS);
export const subjectiveExclusions = () => EXCLUDED_SUBJECTIVE_LABELS.map(label => ({
  label, count: SUBJECTIVE_RATINGS.reduce((count, row) => count + row.metrics.filter(metric => metric.label === label).length, 0),
}));

const exact = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
type Source = (typeof SUBJECTIVE_RATINGS)[number];
const matches = (entry: ResearchEntry, source: Source) =>
  entry.slug === source.slug || [entry.title, ...entry.synonyms].some(alias => exact(alias) === exact(source.name));

/** No fuzzy matching, inferred equivalents or description-held status changes. */
export function researchSubjectiveRatings(entry: ResearchEntry | undefined, entries: ResearchEntry[]) {
  if (!entry?.published) return undefined;
  const candidates = SUBJECTIVE_RATINGS.filter(source => matches(entry, source));
  const source = candidates.length === 1 ? candidates[0] : undefined;
  if (!source) return undefined;
  const publishedMatches = entries.filter(row => row.published && matches(row, source));
  if (publishedMatches.length !== 1 || publishedMatches[0]?.id !== entry.id) return undefined;
  return { slug: source.slug, name: source.name, overall: source.overall, metrics: source.metrics.filter(metric => !excluded.has(metric.label)) };
}