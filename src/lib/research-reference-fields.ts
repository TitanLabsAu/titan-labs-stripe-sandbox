import type { ResearchEntry, ResearchSection } from "./research";

/** Exact native headings; never alias Timeline or inherit another product's fields. */
export const RESEARCH_REFERENCE_LABELS = ["Dosing", "Timing", "Cycle"] as const;
export type ResearchReferenceLabel = (typeof RESEARCH_REFERENCE_LABELS)[number];
export const isResearchReferenceSection = (section: ResearchSection) => RESEARCH_REFERENCE_LABELS.some(label => section.heading === label);
export function referenceFieldValue(content: ResearchSection[], label: ResearchReferenceLabel) {
  return content.find(section => section.heading === label)?.body ?? "";
}
/** Preserve other saved sections verbatim and in order. Blank values remove the designated row. */
export function setReferenceField(content: ResearchSection[], label: ResearchReferenceLabel, value: string): ResearchSection[] {
  const index = content.findIndex(section => section.heading === label);
  if (index < 0) return value.trim() ? [...content, { heading: label, body: value }] : content;
  return content.flatMap((section, i) => i !== index ? [section] : value.trim() ? [{ ...section, body: value }] : []);
}
/** Only persisted values on THIS published entry can appear publicly. */
export function publishedReferenceRows(entry: ResearchEntry | undefined) {
  if (!entry?.published) return [];
  return RESEARCH_REFERENCE_LABELS.flatMap(label => {
    const value = referenceFieldValue(entry.content, label);
    return value.trim() ? [{ label, value }] : [];
  });
}