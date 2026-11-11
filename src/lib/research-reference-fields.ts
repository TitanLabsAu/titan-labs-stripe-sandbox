import type { ResearchEntry, ResearchSection } from "./research";

/** Exact native headings; never alias Timeline or inherit another product's fields. */
export const RESEARCH_REFERENCE_LABELS = ["Dosing", "Timing", "Cycle"] as const;
export const STUDY_READOUT_LABELS = ["Loading", "Maintenance", "Route", "Loading duration", "Timing", "Notes"] as const;
export const RESEARCH_EDITOR_LABELS = [...STUDY_READOUT_LABELS, "Dosing", "Cycle"] as const;
export type ResearchReferenceLabel = (typeof RESEARCH_EDITOR_LABELS)[number];

function referenceHeading(label: ResearchReferenceLabel) {
  return RESEARCH_REFERENCE_LABELS.some(legacy => legacy === label) ? label : `Study readout: ${label}`;
}
export const isResearchReferenceSection = (section: ResearchSection) => RESEARCH_EDITOR_LABELS.some(label => section.heading === referenceHeading(label));
export function referenceFieldValue(content: ResearchSection[], label: ResearchReferenceLabel) {
  return content.find(section => section.heading === referenceHeading(label))?.body ?? "";
}
/** Preserve other saved sections verbatim and in order. Blank values remove the designated row. */
export function setReferenceField(content: ResearchSection[], label: ResearchReferenceLabel, value: string): ResearchSection[] {
  const index = content.findIndex(section => section.heading === referenceHeading(label));
  if (index < 0) return value.trim() ? [...content, { heading: referenceHeading(label), body: value }] : content;
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

/** Admin previews may show an unpublished entry; the public view uses published entries only. */
export function studyReadout(entry: ResearchEntry, preview = false) {
  if (!entry.published && !preview) return { fields: [], notes: "" };
  const fields = RESEARCH_EDITOR_LABELS.flatMap(label => {
    if (label === "Notes") return [];
    const value = referenceFieldValue(entry.content, label);
    return value.trim() ? [{ label, value }] : [];
  });
  return { fields, notes: referenceFieldValue(entry.content, "Notes").trim() };
}
