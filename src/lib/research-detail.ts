import type { ResearchEntry } from "./research";
import { isResearchReferenceSection, publishedReferenceRows } from "./research-reference-fields";

/** Presentation only: never split prose into invented clinical steps or infer protocols. */
export function researchDetailModel(entry: ResearchEntry) {
  return {
    mechanism: entry.content.filter(section => /mechanism|research context/i.test(section.heading)),
    findings: entry.research_findings,
    overview: entry.at_a_glance || entry.summary,
    counts: { references: entry.source_references.length, notes: entry.content.filter(section => !isResearchReferenceSection(section)).length, findings: entry.research_findings.length },
    quick: [
      { label: "Class", value: entry.category || "—" },
    ],
    protocol: publishedReferenceRows(entry),
    ratings: ["Efficacy rating", "Safety rating", "Overall rating"].map(label => ({ label, value: "—" })),
  };
}