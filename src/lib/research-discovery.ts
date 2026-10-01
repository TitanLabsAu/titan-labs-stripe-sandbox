import { BookOpen, Brain, Dumbbell, Flame, HeartPulse, Shield, Sparkles, type LucideIcon } from "lucide-react";
import type { ResearchEntry } from "@/lib/research";

export type ResearchCollection = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  categories: string[];
  terms: string[];
};

export const RESEARCH_COLLECTIONS: ResearchCollection[] = [
  {
    slug: "metabolic",
    title: "Weight & Metabolic Research",
    shortTitle: "Metabolic",
    description: "Explore research involving metabolic signalling, body-weight regulation, mitochondrial biology and energy metabolism.",
    icon: Flame,
    categories: ["Fat Loss & Metabolic"],
    terms: ["retatrutide", "tirzepatide", "aod-9604", "mots-c", "5-amino-1mq", "slu-pp-332"],
  },
  {
    slug: "growth",
    title: "Growth & GH Research",
    shortTitle: "Growth & GH",
    description: "Research involving growth hormone, GHRH biology, secretagogues and the GH/IGF-1 axis.",
    icon: Dumbbell,
    categories: ["Growth & GH"],
    terms: ["hgh", "somatropin", "cjc-1295", "ipamorelin", "sermorelin", "tesamorelin"],
  },
  {
    slug: "recovery",
    title: "Healing & Recovery Research",
    shortTitle: "Recovery",
    description: "Explore experimental research involving tissue repair, inflammatory signalling and recovery-related biology.",
    icon: HeartPulse,
    categories: ["Healing & Recovery"],
    terms: ["ahk-cu", "ara-290", "bpc-157", "ghk-cu", "kpv", "tb-500", "thymosin alpha-1"],
  },
  {
    slug: "longevity",
    title: "Longevity & Cellular Research",
    shortTitle: "Longevity",
    description: "Research involving cellular ageing, redox biology, mitochondria, senescence and related pathways.",
    icon: Sparkles,
    categories: ["Anti-Aging"],
    terms: ["epithalon", "epitalon", "foxo4-dri", "glutathione", "nad+", "ss-31", "elamipretide"],
  },
  {
    slug: "cognitive",
    title: "Cognitive & Neurological Research",
    shortTitle: "Cognitive",
    description: "Explore neurological, behavioural, sleep and cognition-related research with evidence limitations kept visible.",
    icon: Brain,
    categories: ["Cognitive & Mood"],
    terms: ["adamax", "dsip", "selank", "semax"],
  },
  {
    slug: "androgen",
    title: "Androgen Research",
    shortTitle: "Androgen",
    description: "Research involving androgen-receptor biology and anabolic-androgenic compounds, with human and preclinical evidence clearly separated.",
    icon: Shield,
    categories: ["Anabolics"],
    terms: ["testosterone", "nandrolone", "methenolone", "primobolan", "trenbolone"],
  },
  {
    slug: "hormonal",
    title: "Hormonal & Reproductive Research",
    shortTitle: "Hormonal",
    description: "Research involving endocrine, reproductive and melanocortin signalling.",
    icon: BookOpen,
    categories: ["Sexual & Hormonal"],
    terms: ["gonadorelin", "gnrh", "hcg", "hmg", "kisspeptin", "melanotan", "pt-141", "bremelanotide"],
  },
];

export function entriesForCollection(entries: ResearchEntry[], collection: ResearchCollection) {
  return entries.filter((entry) => {
    if (collection.categories.includes(entry.category)) return true;
    const haystack = [entry.slug, entry.title, ...entry.tags, ...entry.synonyms].join(" ").toLowerCase();
    return collection.terms.some((term) => haystack.includes(term));
  });
}

export function relatedResearch(entry: ResearchEntry, entries: ResearchEntry[], limit = 4) {
  const tags = new Set(entry.tags.map((tag) => tag.toLowerCase()));
  return entries
    .filter((candidate) => candidate.id !== entry.id)
    .map((candidate) => ({
      entry: candidate,
      score:
        (candidate.category === entry.category ? 4 : 0) +
        candidate.tags.reduce((score, tag) => score + (tags.has(tag.toLowerCase()) ? 2 : 0), 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map(({ entry: candidate }) => candidate);
}

export const TITAN_BLENDS = [
  { slug: "glow", title: "GLOW", ingredients: ["BPC-157", "TB-500", "GHK-Cu"] },
  { slug: "klow", title: "KLOW", ingredients: ["BPC-157", "TB-500", "GHK-Cu", "KPV"] },
  { slug: "wolverine-stack", title: "Wolverine", ingredients: ["BPC-157", "TB-500"] },
] as const;

export function blendsForEntry(entry: ResearchEntry) {
  const haystack = [entry.title, entry.slug, ...entry.synonyms].join(" ").toLowerCase();
  return TITAN_BLENDS.filter((blend) =>
    blend.ingredients.some((ingredient) => haystack.includes(ingredient.toLowerCase())),
  );
}
