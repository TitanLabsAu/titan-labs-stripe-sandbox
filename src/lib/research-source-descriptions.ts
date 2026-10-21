import type { ResearchEntry } from "./research";

/** Owner-supplied quotations only; never scientific findings or stored research data. */
export const RESEARCH_SOURCE_DESCRIPTIONS = [
  {
    "slug": "bpc-157",
    "name": "BPC-157",
    "nick": "The Repair Crew",
    "one": "A 15-amino-acid healing peptide that tells your body to rebuild damaged tissue faster."
  },
  {
    "slug": "tb-500",
    "name": "TB-500",
    "nick": "The Flow State",
    "one": "A systemic healing peptide that boosts flexibility, blood flow, and whole-body recovery."
  },
  {
    "slug": "ghk-cu",
    "name": "GHK-Cu",
    "nick": "The Skin Architect",
    "one": "A copper peptide that rebuilds collagen, heals skin, and remodels aging tissue."
  },
  {
    "slug": "kpv",
    "name": "KPV",
    "nick": "The Calmer",
    "one": "A tiny anti-inflammatory peptide fragment loved for calming gut and skin flare-ups."
  },
  {
    "slug": "ahk-cu",
    "name": "AHK-Cu",
    "nick": "The Follicle Fuel",
    "one": "A copper peptide cousin of GHK-Cu, favored for hair-follicle and skin support."
  },
  {
    "slug": "thymosin-alpha-1",
    "name": "Thymosin Alpha-1",
    "nick": "The Shield",
    "one": "An immune-modulating peptide that helps the body respond smarter to stress and illness."
  },
  {
    "slug": "retatrutide",
    "name": "Retatrutide",
    "nick": "The Triple Threat",
    "one": "A next-gen triple-hormone agonist producing some of the biggest fat-loss numbers yet seen."
  },
  {
    "slug": "tirzepatide",
    "name": "Tirzepatide",
    "nick": "The Twin Engine",
    "one": "A dual-hormone agonist that delivers strong, well-studied appetite control and fat loss."
  },
  {
    "slug": "mots-c",
    "name": "MOTS-C",
    "nick": "The Power Plant",
    "one": "A mitochondrial peptide that improves metabolic health, insulin sensitivity, and endurance."
  },
  {
    "slug": "aod-9604",
    "name": "AOD-9604",
    "nick": "The Fat Fragment",
    "one": "An HGH fragment engineered to burn fat without touching blood sugar or overall growth."
  },
  {
    "slug": "5-amino-1mq",
    "name": "5-Amino-1MQ",
    "nick": "The Enzyme Blocker",
    "one": "An oral compound that blocks the NNMT enzyme your body uses to store fat."
  },
  {
    "slug": "slu-pp-332",
    "name": "SLU-PP-332",
    "nick": "Exercise-in-a-Molecule",
    "one": "An early-stage compound that mimics the metabolic signals of endurance exercise."
  },
  {
    "slug": "tesamorelin",
    "name": "Tesamorelin",
    "nick": "The Belly Burner",
    "one": "A GH-releasing peptide clinically proven to target stubborn visceral belly fat."
  },
  {
    "slug": "hgh",
    "name": "HGH",
    "nick": "The Original",
    "one": "The real, full-length growth hormone — the most powerful (and most serious) tool for growth, recovery, and repair."
  },
  {
    "slug": "somatropin",
    "name": "Somatropin",
    "nick": "The Pharma Grade",
    "one": "Pharmaceutical-grade synthetic HGH — identical to your body's own growth hormone."
  },
  {
    "slug": "nad",
    "name": "NAD+",
    "nick": "The Cellular Spark",
    "one": "A coenzyme central to cellular energy and DNA repair — the longevity crowd's favorite."
  },
  {
    "slug": "ss-31",
    "name": "SS-31",
    "nick": "The Mito Medic",
    "one": "A mitochondria-targeted peptide that protects cellular energy production and reduces oxidative stress."
  },
  {
    "slug": "foxo4-dri",
    "name": "FOXO4-DRI",
    "nick": "The Zombie Hunter",
    "one": "An experimental senolytic peptide designed to clear aged, dysfunctional 'zombie' cells."
  },
  {
    "slug": "glutathione",
    "name": "Glutathione",
    "nick": "The Master Antioxidant",
    "one": "The body's master antioxidant — central to detox, immune function, and glowing skin."
  },
  {
    "slug": "semax",
    "name": "Semax",
    "nick": "The Focus Switch",
    "one": "A nootropic peptide for sharp focus, memory, and a resilient, motivated mood."
  },
  {
    "slug": "selank",
    "name": "Selank",
    "nick": "The Calm",
    "one": "An anti-anxiety nootropic that brings calm focus without sedation or dependency."
  },
  {
    "slug": "dsip",
    "name": "DSIP",
    "nick": "The Sandman",
    "one": "A sleep-focused peptide that helps you fall into deeper, more restorative delta-wave sleep."
  },
  {
    "slug": "pt-141",
    "name": "PT-141",
    "nick": "The Spark",
    "one": "A libido-boosting peptide that works through the brain, not the bloodstream — for men and women."
  },
  {
    "slug": "kisspeptin",
    "name": "Kisspeptin",
    "nick": "The Igniter",
    "one": "The upstream signal that kickstarts your body's entire natural sex-hormone cascade."
  },
  {
    "slug": "melanotan-2",
    "name": "Melanotan-2",
    "nick": "The Sun & Spark",
    "one": "A tanning peptide that also boosts libido — the original, less selective Melanotan."
  },
  {
    "slug": "snap-8",
    "name": "SNAP-8",
    "nick": "The Line Smoother",
    "one": "A topical 'Botox-like' peptide that relaxes facial muscles to soften expression lines."
  },
  {
    "slug": "testosterone",
    "name": "Testosterone",
    "nick": "The Foundation",
    "one": "The foundational anabolic hormone underneath every serious mass, strength, and vitality protocol."
  },
  {
    "slug": "nandrolone-decanoate",
    "name": "Nandrolone Decanoate",
    "nick": "Deca",
    "one": "A long-acting mass builder famous for being unusually kind to joints under heavy loads."
  },
  {
    "slug": "trenbolone",
    "name": "Trenbolone",
    "nick": "The Beast",
    "one": "An extremely powerful anabolic for advanced users only — big results, but a harsh side-effect profile."
  },
  {
    "slug": "ara-290",
    "name": "ARA-290",
    "nick": "The Nerve Repairer",
    "one": "An erythropoietin-derived peptide studied for nerve repair and inflammation, without EPO's blood-thickening effects."
  },
  {
    "slug": "adamax",
    "name": "Adamax",
    "nick": "The Semax Cousin",
    "one": "A designer nootropic peptide built by adding an adamantane group to Semax for claimed extra stability and potency."
  },
  {
    "slug": "glow",
    "name": "GLOW",
    "nick": "The Repair Blend",
    "one": "An all-in-one repair blend combining local healing, systemic recovery, and tissue remodeling."
  },
  {
    "slug": "klow",
    "name": "KLOW",
    "nick": "GLOW + KPV",
    "one": "The GLOW blend plus KPV, adding extra anti-inflammatory power for gut and skin issues."
  },
  {
    "slug": "wolverine",
    "name": "Wolverine Stack",
    "nick": "Heal Like Wolverine",
    "one": "The legendary injury-recovery duo — local repair plus systemic healing for a comeback worthy of the name."
  }
] as const;

export const HELD_RESEARCH_SOURCE_DESCRIPTIONS = [
  {
    "slug": "ipamorelin",
    "name": "Ipamorelin",
    "reason": "Blanket side-effect assurance and beginner suitability"
  },
  {
    "slug": "cjc-1295",
    "name": "CJC-1295 (w/o DAC)",
    "reason": "Combination recommendation"
  },
  {
    "slug": "cjc-1295-ipamorelin",
    "name": "CJC-1295 + Ipamorelin",
    "reason": "Administration schedule"
  },
  {
    "slug": "sermorelin",
    "name": "Sermorelin",
    "reason": "Beginner suitability recommendation"
  },
  {
    "slug": "hmg",
    "name": "HMG",
    "reason": "Combination recommendation"
  },
  {
    "slug": "epithalon",
    "name": "Epithalon",
    "reason": "Administration/cycle schedule"
  },
  {
    "slug": "gonadorelin",
    "name": "Gonadorelin",
    "reason": "Hormonal-protocol recommendation"
  },
  {
    "slug": "hcg",
    "name": "HCG",
    "reason": "Cycle/protocol recommendation"
  },
  {
    "slug": "melanotan-1",
    "name": "Melanotan-1",
    "reason": "Comparative side-effect assurance"
  },
  {
    "slug": "primobolan",
    "name": "Primobolan",
    "reason": "Side-effect assurance"
  }
] as const;

const exact = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const matches = (entry: ResearchEntry, source: { slug: string; name: string }) =>
  entry.slug === source.slug || [entry.title, ...entry.synonyms].some(alias => exact(alias) === exact(source.name));

/** Fail closed for held identities, unpublished entries and either kind of ambiguity. */
export function researchSourceDescription(entry: ResearchEntry | undefined, entries: ResearchEntry[]) {
  if (!entry?.published || HELD_RESEARCH_SOURCE_DESCRIPTIONS.some(source => matches(entry, source))) return undefined;
  const candidates = RESEARCH_SOURCE_DESCRIPTIONS.filter(source => matches(entry, source));
  const source = candidates.length === 1 ? candidates[0] : undefined;
  if (!source) return undefined;
  const publishedMatches = entries.filter(row => row.published && matches(row, source));
  return publishedMatches.length === 1 && publishedMatches[0]?.id === entry.id ? source : undefined;
}
