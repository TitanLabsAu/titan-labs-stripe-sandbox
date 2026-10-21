import reference from "./research-explanations.data.json";
import type { ResearchEntry } from "./research";

export type ExplanationCard = { num: string; title: string; desc: string };
export type ExplanationMode = "plain" | "science";
export const EXPLANATION_PROVENANCE = "Owner-supplied research-mechanism-benefits-reference.json; extracted source editorial quotations (Donny Optimize), not verified Titan findings.";
export const EXPLANATION_CONTEXT = "Editorial quotations, not verified clinical results or safety guidance. See Science & References for Titan’s qualified research.";

/** Whole cards withheld, never rewritten. Keys retain the owner's exact source numbering. */
export const EXCLUDED_EXPLANATION_CARDS: Record<string, string> = {
  "kpv:benefits:03": "Blanket immune-safety reassurance",
  "kpv:benefits:04": "Combination recommendation",
  "ahk-cu:benefits:03": "Daily-use tolerability reassurance",
  "aod-9604:steps:03": "Blanket side-effect reassurance",
  "aod-9604:benefits:02": "Blanket blood-sugar safety reassurance",
  "aod-9604:benefits:03": "Blanket absence-of-growth-effects reassurance",
  "5-amino-1mq:benefits:01": "Route and daily administration instruction",
  "5-amino-1mq:benefits:03": "Beginner suitability recommendation",
  "ipamorelin:steps:02": "Blanket absence-of-side-effects reassurance",
  "ipamorelin:benefits:04": "Blanket side-effect reassurance",
  "cjc-1295:steps:02": "Combination recommendation",
  "cjc-1295:steps:03": "Nightly administration schedule",
  "cjc-1295:benefits:04": "Combination recommendation",
  "cjc-1295-ipamorelin:steps:02": "Minimal side-effect reassurance",
  "cjc-1295-ipamorelin:benefits:04": "Minimal side-effect reassurance",
  "sermorelin:steps:03": "Low-risk personal suitability recommendation",
  "sermorelin:benefits:01": "Beginner suitability recommendation",
  "sermorelin:benefits:03": "Tolerability/side-effect reassurance",
  "somatropin:steps:02": "Pen/vial dosing guidance",
  "somatropin:benefits:01": "Purity/dosing reassurance for personal administration",
  "hmg:steps:03": "Combination protocol recommendation",
  "hmg:benefits:02": "Combination protocol recommendation",
  "epithalon:steps:03": "Personal cycle schedule",
  "selank:steps:02": "Blanket absence-of-drowsiness reassurance",
  "selank:benefits:01": "Blanket sedation/dependency reassurance",
  "dsip:benefits:03": "Night-time combination schedule",
  "pt-141:benefits:04": "As-needed administration schedule",
  "gonadorelin:benefits:01": "On-cycle recommendation",
  "gonadorelin:benefits:03": "Post-cycle recommendation",
  "hcg:steps:03": "On-cycle recommendation",
  "hcg:benefits:01": "On-cycle recommendation",
  "hcg:benefits:02": "Hormonal protocol recommendation",
  "melanotan-1:steps:03": "Comparative side-effect reassurance",
  "melanotan-1:benefits:02": "Comparative side-effect reassurance",
  "snap-8:benefits:02": "Daily topical administration instruction",
  "testosterone:steps:03": "Combination protocol recommendation",
  "testosterone:benefits:03": "Protocol foundation recommendation",
  "nandrolone-decanoate:benefits:01": "Longer-cycle recommendation",
  "nandrolone-decanoate:benefits:03": "Injection frequency guidance",
  "primobolan:benefits:02": "Comparative safety reassurance",
  "ara-290:benefits:02": "Explicit dose/day instruction",
  "ara-290:benefits:04": "Blanket side-effect reassurance",
};

export const explanationSources = reference.entries;
const exact = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
const matches = (entry: ResearchEntry, source: { slug: string; name: string }) =>
  entry.slug === source.slug || [entry.title, ...entry.synonyms].some(value => exact(value) === exact(source.name));

/** Exact unique identity only, on a published entry. No fuzzy blend/compound inheritance. */
export function researchExplanations(entry: ResearchEntry, entries: ResearchEntry[]) {
  if (!entry.published) return undefined;
  const candidates = reference.entries.filter(source => matches(entry, source));
  if (candidates.length !== 1) return undefined;
  const source = candidates[0];
  if (!source) return undefined;
  const destinations = entries.filter(row => row.published && matches(row, source));
  if (destinations.length !== 1 || destinations[0]?.id !== entry.id) return undefined;
  const keep = (field: "steps" | "stepsSci" | "benefits") => source[field].filter(card => !EXCLUDED_EXPLANATION_CARDS[`${source.slug}:${field}:${card.num}`]);
  return { slug: source.slug, plain: keep("steps"), science: keep("stepsSci"), benefits: keep("benefits") };
}

export function explanationModeCards(source: NonNullable<ReturnType<typeof researchExplanations>>, mode: ExplanationMode) {
  return mode === "science" ? source.science : source.plain;
}

export function explanationExclusions() {
  return reference.entries.flatMap(source => (["steps", "stepsSci", "benefits"] as const).flatMap(field => source[field].flatMap(card => {
    const reason = EXCLUDED_EXPLANATION_CARDS[`${source.slug}:${field}:${card.num}`];
    return reason ? [{ slug: source.slug, field, ...card, reason }] : [];
  })));
}