import type { ResearchEntry } from "./research";
import { researchSubjectiveRatings } from "./research-subjective-ratings";

/** Owner-supplied descriptive card text (not molecular formulas). Only values the owner has supplied. */
const SHOWCASE_DESCRIPTORS: Record<string, string> = {
  retatrutide: "GLP-1 / GIP / glucagon triple agonist",
};

/** Source card cells: exact first three permitted opinion scores; never substituted with counts. */
export function researchShowcaseStats(entry: ResearchEntry, entries: ResearchEntry[]) {
  const ratings = researchSubjectiveRatings(entry, entries);
  return (ratings?.metrics ?? []).slice(0, 3).map(metric => ({
    val: metric.value,
    label: metric.label.split(" ")[0].toUpperCase().slice(0, 6),
    fullLabel: metric.label,
  }));
}

export function researchShowcaseDescriptor(entry: ResearchEntry): { kind: "descriptor" | "formula"; text: string } | undefined {
  const descriptor = SHOWCASE_DESCRIPTORS[entry.slug];
  if (descriptor) return { kind: "descriptor", text: descriptor };
  return entry.molecular_formula ? { kind: "formula", text: entry.molecular_formula } : undefined;
}
