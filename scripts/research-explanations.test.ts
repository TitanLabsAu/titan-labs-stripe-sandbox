import { describe, expect, test } from "bun:test";
import { explanationSources, explanationExclusions, EXCLUDED_EXPLANATION_CARDS, explanationModeCards, researchExplanations } from "../src/lib/research-explanations";
import { toResearchEntry } from "../src/lib/research";
import { researchDetailModel } from "../src/lib/research-detail";
import { publishedReferenceRows } from "../src/lib/research-reference-fields";
import { researchSourceDescription, HELD_RESEARCH_SOURCE_DESCRIPTIONS } from "../src/lib/research-source-descriptions";
import { researchSubjectiveRatings } from "../src/lib/research-subjective-ratings";

const entries = explanationSources.map(source => toResearchEntry({ id: source.slug, slug: source.slug, title: source.name, published: true, summary: "Saved qualified summary. Human efficacy unknown.", content: [{ heading: "Reported mechanism", body: "Whole qualified saved mechanism." }, { heading: "Dosing", body: " " }, { heading: "Timing", body: "" }, { heading: "Cycle", body: "\n" }], research_findings: ["Saved qualified finding."], source_references: [{ title: "Original reference", doi: "10.1000/original" }] }));
const reta = entries.find(entry => entry.slug === "retatrutide");
if (!reta) throw new Error("Missing Retatrutide fixture");

describe("Compact editorial explanation boundaries", () => {
  test("all 44 exact uniquely published entries map without modifying any source wording", () => {
    expect(explanationSources.length).toBe(44);
    for (const entry of entries) {
      const source = explanationSources.find(row => row.slug === entry.slug);
      const result = researchExplanations(entry, entries);
      expect(result?.slug).toBe(entry.slug);
      if (!source || !result) throw new Error("Missing exact map");
      for (const [field, cards] of [["steps", result.plain], ["stepsSci", result.science], ["benefits", result.benefits]] as const) {
        expect(cards).toEqual(source[field].filter(card => !EXCLUDED_EXPLANATION_CARDS[`${source.slug}:${field}:${card.num}`]));
      }
    }
  });
  test("Retatrutide plain and scientific arrays stay distinct and exact", () => {
    const source = researchExplanations(reta, entries);
    if (!source) throw new Error("Missing mapping");
    expect(explanationModeCards(source, "plain").map(card => card.title)).toEqual(["Hits three targets", "Hunger drops", "Fat burns faster"]);
    expect(explanationModeCards(source, "science").map(card => card.title)).toEqual(["Incretin agonism", "Glucagon activation", "Net deficit"]);
    expect(source.benefits.map(card => card.title)).toEqual(["Powerful Fat Loss", "Appetite Suppression", "Better Blood Sugar", "Metabolic Uplift"]);
    expect(source.plain[1]?.desc).toBe("You feel full sooner and think about food far less.");
  });
  test("every exclusion is a real whole source card, with no silent rewrite or stale key", () => {
    const excluded = explanationExclusions();
    expect(excluded.length).toBe(42);
    expect(excluded.length).toBe(Object.keys(EXCLUDED_EXPLANATION_CARDS).length);
    for (const card of excluded) {
      const entry = entries.find(row => row.slug === card.slug);
      if (!entry) throw new Error("Unknown exclusion");
      const mapped = researchExplanations(entry, entries);
      const cards = card.field === "steps" ? mapped?.plain : card.field === "stepsSci" ? mapped?.science : mapped?.benefits;
      expect(cards?.some(row => row.num === card.num)).toBe(false);
    }
  });
  test("nightly, short-cycle, route/day and safety cards are withheld verbatim", () => {
    const excluded = explanationExclusions();
    expect(excluded.find(card => card.slug === "cjc-1295" && card.field === "steps" && card.num === "03")?.desc).toBe("Consistent nightly dosing improves recovery and body comp.");
    expect(excluded.find(card => card.slug === "epithalon")?.desc).toBe("Typically done as short courses a couple times a year.");
    expect(excluded.find(card => card.slug === "ara-290" && card.num === "02")?.desc).toBe("Phase 2 trials showed pain-score improvement at the 4 mg/day dose.");
    expect(excluded.find(card => card.slug === "5-amino-1mq" && card.num === "01")?.desc).toBe("No injections — just a daily capsule.");
  });
  test("42 missing Science arrays remain missing, not copied from Plain English", () => {
    expect(explanationSources.filter(source => !source.stepsSci.length).length).toBe(42);
    for (const source of explanationSources.filter(source => !source.stepsSci.length)) {
      const entry = entries.find(row => row.slug === source.slug);
      if (!entry) throw new Error("Missing entry");
      const mapped = researchExplanations(entry, entries);
      if (!mapped) throw new Error("Missing mapping");
      expect(explanationModeCards(mapped, "science")).toEqual([]);
    }
  });
  test("draft, unknown, fuzzy and duplicate destinations fail closed", () => {
    expect(researchExplanations({ ...reta, published: false }, entries)).toBeUndefined();
    expect(researchExplanations({ ...reta, slug: "reta", title: "Retatrutide 30mg" }, entries)).toBeUndefined();
    expect(researchExplanations(reta, [...entries, { ...reta, id: "duplicate" }])).toBeUndefined();
    expect(researchExplanations(reta, [])).toBeUndefined();
  });
  test("exact name aliases work but conflicting source identity fails closed", () => {
    const aliased = { ...reta, slug: "reta-30" };
    expect(researchExplanations(aliased, entries.map(entry => entry.id === reta.id ? aliased : entry))?.slug).toBe("retatrutide");
    expect(researchExplanations({ ...reta, synonyms: ["BPC-157"] }, entries)).toBeUndefined();
  });
  test("unpublished duplicate does not expose draft data or break published mapping", () => {
    expect(researchExplanations(reta, [...entries, { ...reta, id: "draft", published: false, summary: "Private" }])?.slug).toBe("retatrutide");
  });
  test("every saved summary, mechanism, finding and reference is unchanged", () => {
    const before = structuredClone(entries);
    for (const entry of entries) {
      researchExplanations(entry, entries);
      expect(researchDetailModel(entry).overview).toBe(entry.summary);
      expect(researchDetailModel(entry).mechanism).toEqual([entry.content[0]]);
      expect(researchDetailModel(entry).findings).toEqual(entry.research_findings);
      expect(publishedReferenceRows(entry)).toEqual([]);
    }
    expect(entries).toEqual(before);
  });
  test("existing held description policy and ratings are unchanged by explanations", () => {
    expect(HELD_RESEARCH_SOURCE_DESCRIPTIONS.length).toBe(10);
    for (const held of HELD_RESEARCH_SOURCE_DESCRIPTIONS) {
      const entry = entries.find(row => row.slug === held.slug);
      if (!entry) throw new Error("Missing held fixture");
      expect(researchSourceDescription(entry, entries)).toBeUndefined();
    }
    const ratingsBefore = researchSubjectiveRatings(reta, entries);
    researchExplanations(reta, entries);
    expect(researchSubjectiveRatings(reta, entries)).toEqual(ratingsBefore);
  });
});