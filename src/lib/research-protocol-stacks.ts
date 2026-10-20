import type { ResearchEntry } from "./research";

/** Names-only reference categories. Never a protocol or a recommendation. */
export const PROTOCOL_STACK_GOALS = [
  { id: "weight-loss", title: "Weight Loss", compounds: ["Retatrutide", "5-Amino-1MQ", "AOD-9604", "HGH", "MOTS-C", "SS-31", "NAD+"] },
  { id: "bulking", title: "Bulking", compounds: ["Testosterone", "Nandrolone Decanoate", "HGH", "CJC-1295 + Ipamorelin", "BPC-157", "MOTS-C", "SS-31", "NAD+"] },
  { id: "cutting", title: "Cutting", compounds: ["Testosterone", "Nandrolone Decanoate", "HGH", "Tesamorelin", "Primobolan", "MOTS-C", "SS-31", "NAD+"] },
  { id: "optimization", title: "Optimization", compounds: ["CJC-1295 + Ipamorelin", "NAD+", "BPC-157", "Glutathione", "MOTS-C", "SS-31"] },
  { id: "longevity", title: "Longevity", compounds: ["Epithalon", "NAD+", "GHK-Cu", "SS-31", "MOTS-C"] },
  { id: "recovery", title: "Recovery", compounds: ["BPC-157", "TB-500", "GHK-Cu", "KPV", "MOTS-C", "SS-31", "NAD+"] },
] as const;

export const PROTOCOL_TOPIC_OVERVIEWS: Record<(typeof PROTOCOL_STACK_GOALS)[number]["id"], string> = {
  "weight-loss": "Explore research on metabolic signalling, energy metabolism and body-weight regulation. The entries below describe individual compounds and the limits of their cited research.",
  bulking: "Explore research involving androgen signalling, growth-hormone biology and muscle-related experimental models. Each entry provides its own research context rather than a combined regimen.",
  cutting: "Explore research involving body composition, endocrine signalling and cellular energy metabolism. Individual study contexts are kept separate from this reference grouping.",
  optimization: "Explore a broad research topic spanning endocrine signalling, cellular metabolism, redox biology and tissue-related models. This category brings together references, not a performance prescription.",
  longevity: "Explore research involving cellular ageing, mitochondrial biology and related molecular pathways. The compound entries describe distinct areas of investigation, not established longevity outcomes.",
  recovery: "Explore experimental research involving tissue repair, inflammatory signalling and cellular metabolism. Read each compound's saved research context and qualifications independently.",
};

/** Return the complete saved wording, never an inferred role or shortened claim. */
export function protocolResearchOverview(entry: ResearchEntry | undefined): string | undefined {
  if (!entry?.published) return undefined;
  if (entry.at_a_glance.trim()) return entry.at_a_glance;
  return entry.summary.trim() ? entry.summary : undefined;
}

export function protocolGoal(id: string) {
  return PROTOCOL_STACK_GOALS.find((goal) => goal.id === id) ?? PROTOCOL_STACK_GOALS[0];
}

const exact = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/** Known research routes recorded in the site's research sitemap, not catalogue aliases. */
const RESEARCH_SLUGS: Record<string, string> = {
  "Retatrutide": "retatrutide", "5-Amino-1MQ": "5-amino-1mq", "AOD-9604": "aod-9604",
  "HGH": "hgh", "MOTS-C": "mots-c", "SS-31": "ss-31", "NAD+": "nad",
  "Testosterone": "testosterone", "Nandrolone Decanoate": "nandrolone-decanoate",
  "CJC-1295 + Ipamorelin": "cjc-1295-ipamorelin", "BPC-157": "bpc-157",
  "Tesamorelin": "tesamorelin", "Primobolan": "primobolan", "Glutathione": "glutathione",
  "Epithalon": "epithalon", "GHK-Cu": "ghk-cu", "TB-500": "tb-500", "KPV": "kpv",
};

/** Exact named alias only; ambiguity and unpublished records fail closed. No fuzzy product matching. */
export function publishedProtocolEntry(name: string, entries: ResearchEntry[]): ResearchEntry | undefined {
  const matches = entries.filter((entry) => entry.published &&
    (entry.slug === RESEARCH_SLUGS[name] || [entry.title, ...entry.synonyms].some((alias) => exact(alias) === exact(name))));
  return matches.length === 1 ? matches[0] : undefined;
}