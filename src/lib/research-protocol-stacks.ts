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

export function protocolGoal(id: string) {
  return PROTOCOL_STACK_GOALS.find((goal) => goal.id === id) ?? PROTOCOL_STACK_GOALS[0];
}

const exact = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/** Exact named alias only; ambiguity and unpublished records fail closed. No fuzzy product matching. */
export function publishedProtocolEntry(name: string, entries: ResearchEntry[]): ResearchEntry | undefined {
  const matches = entries.filter((entry) => entry.published &&
    [entry.title, ...entry.synonyms].some((alias) => exact(alias) === exact(name)));
  return matches.length === 1 ? matches[0] : undefined;
}