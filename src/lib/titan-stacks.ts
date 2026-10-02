export type TitanStack = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  compounds: string[];
};

export const TITAN_STACK_LIBRARY: TitanStack[] = [
  { id: "weight-loss", number: "01", title: "Weight Loss", subtitle: "Metabolic research collection", level: "Beginner", compounds: ["Retatrutide", "5-Amino-1MQ", "AOD-9604", "HGH", "MOTS-C", "SS-31", "NAD+"] },
  { id: "bulking", number: "02", title: "Bulking", subtitle: "Growth and performance research collection", level: "Advanced", compounds: ["Testosterone", "Nandrolone Decanoate", "HGH", "CJC-1295 + Ipamorelin", "BPC-157", "MOTS-C", "SS-31", "NAD+"] },
  { id: "cutting", number: "03", title: "Cutting", subtitle: "Body-composition research collection", level: "Advanced", compounds: ["Testosterone", "Nandrolone Decanoate", "HGH", "Tesamorelin", "Primobolan", "MOTS-C", "SS-31", "NAD+"] },
  { id: "optimization", number: "04", title: "Optimization", subtitle: "General performance research collection", level: "Beginner", compounds: ["CJC-1295 + Ipamorelin", "NAD+", "BPC-157", "Glutathione", "MOTS-C", "SS-31"] },
  { id: "longevity", number: "05", title: "Longevity", subtitle: "Cellular and longevity research collection", level: "Intermediate", compounds: ["Epithalon", "NAD+", "GHK-Cu", "MOTS-C", "SS-31"] },
  { id: "recovery", number: "06", title: "Recovery", subtitle: "Repair and recovery research collection", level: "Beginner", compounds: ["BPC-157", "TB-500", "GHK-Cu", "KPV", "MOTS-C", "SS-31", "NAD+"] },
];

export function productMatchesCompound(productName: string, compound: string) {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const name = clean(productName);
  const aliases: Record<string, string[]> = {
    "5-Amino-1MQ": ["5 amino 1mq"],
    "CJC-1295 + Ipamorelin": ["cjc 1295 ipamorelin", "cjc 1295 ipa"],
    "Nandrolone Decanoate": ["nandrolone decanoate", "deca"],
    "Primobolan": ["primobolan", "methenolone"],
    "HGH": ["hgh 191aa", "hgh"],
    "NAD+": ["nad"],
    "GHK-Cu": ["ghk cu"],
    "TB-500": ["tb 500", "thymosin b4"],
    "BPC-157": ["bpc 157"],
    "SS-31": ["ss 31"],
    "MOTS-C": ["mots c"],
    "AOD-9604": ["aod 9604"],
  };
  return (aliases[compound] ?? [clean(compound)]).some((alias) => name.includes(clean(alias)));
}
