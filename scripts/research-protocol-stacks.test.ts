import { describe, expect, test } from "bun:test";
import { PROTOCOL_STACK_GOALS, protocolGoal, publishedProtocolEntry } from "../src/lib/research-protocol-stacks";
import { toResearchEntry } from "../src/lib/research";

const entry = (overrides: Record<string, unknown> = {}) => toResearchEntry({ id: "fictional", slug: "nad", title: "NAD+", published: true, ...overrides });
const expected = [
  ["Weight Loss", ["Retatrutide", "5-Amino-1MQ", "AOD-9604", "HGH", "MOTS-C", "SS-31", "NAD+"]],
  ["Bulking", ["Testosterone", "Nandrolone Decanoate", "HGH", "CJC-1295 + Ipamorelin", "BPC-157", "MOTS-C", "SS-31", "NAD+"]],
  ["Cutting", ["Testosterone", "Nandrolone Decanoate", "HGH", "Tesamorelin", "Primobolan", "MOTS-C", "SS-31", "NAD+"]],
  ["Optimization", ["CJC-1295 + Ipamorelin", "NAD+", "BPC-157", "Glutathione", "MOTS-C", "SS-31"]],
  ["Longevity", ["Epithalon", "NAD+", "GHK-Cu", "SS-31", "MOTS-C"]],
  ["Recovery", ["BPC-157", "TB-500", "GHK-Cu", "KPV", "MOTS-C", "SS-31", "NAD+"]],
] as const;

describe("Protocol Stacks reference rules", () => {
  for (const [title, compounds] of expected) test(`${title} exact ordered grouping`, () => {
    expect(PROTOCOL_STACK_GOALS.find(g => g.title === title)?.compounds).toEqual(compounds);
  });
  test("exactly six goals", () => expect(PROTOCOL_STACK_GOALS).toHaveLength(6));
  test("deep-link goal and invalid fallback", () => {
    expect(protocolGoal("longevity").title).toBe("Longevity");
    expect(protocolGoal("unknown").id).toBe("weight-loss");
  });
  test("known exact slug can link only a published entry", () => {
    expect(publishedProtocolEntry("NAD+", [entry({ title: "Nicotinamide adenine dinucleotide" })])?.slug).toBe("nad");
    expect(publishedProtocolEntry("NAD+", [entry({ published: false })])).toBeUndefined();
  });
  test("exact stored alias permitted", () => {
    expect(publishedProtocolEntry("HGH", [entry({ slug: "other", title: "Other", synonyms: ["HGH"] })])?.slug).toBe("other");
  });
  test("no substring, speculative or separate-component matching", () => {
    const rows = [entry({ slug: "nad-plus-blend", title: "NAD+ Blend" }), entry({ slug: "ipamorelin", title: "Ipamorelin" })];
    expect(publishedProtocolEntry("NAD+", rows)).toBeUndefined();
    expect(publishedProtocolEntry("CJC-1295 + Ipamorelin", rows)).toBeUndefined();
  });
  test("missing and ambiguous entries remain unlinked", () => {
    expect(publishedProtocolEntry("NAD+", [])).toBeUndefined();
    expect(publishedProtocolEntry("NAD+", [entry(), entry({ id: "second", slug: "second" })])).toBeUndefined();
  });
  test("linking never changes scientific text or evidence fields", () => {
    const row = entry({ summary: "Existing summary", evidence_status: "limited_human", content: [{ heading: "Existing heading", body: "Existing body" }], source_references: [{ title: "Existing reference", evidence_type: "human_trial" }] });
    const before = JSON.stringify(row);
    expect(publishedProtocolEntry("NAD+", [row])).toBe(row);
    expect(JSON.stringify(row)).toBe(before);
  });
});