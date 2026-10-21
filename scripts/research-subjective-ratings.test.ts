import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { SUBJECTIVE_RATINGS, EXCLUDED_SUBJECTIVE_LABELS, researchSubjectiveRatings, subjectiveExclusions } from "../src/lib/research-subjective-ratings";
import { toResearchEntry } from "../src/lib/research";
import { researchDetailModel } from "../src/lib/research-detail";
import { RESEARCH_SOURCE_DESCRIPTIONS, HELD_RESEARCH_SOURCE_DESCRIPTIONS, researchSourceDescription } from "../src/lib/research-source-descriptions";

const entry = (values = {}) => toResearchEntry({ id: "bpc", slug: "bpc-157", title: "BPC-157", published: true, ...values });
describe("Owner subjective ratings boundaries", () => {
  test("all 44 rows preserve 220 metric values and 44 overall values", () => {
    const supplied = JSON.parse(readFileSync("/mnt/user-uploads/Donny-subjective-ratings-reference.txt", "utf8"));
    expect(SUBJECTIVE_RATINGS).toEqual(supplied.ratings);
    expect(SUBJECTIVE_RATINGS.length).toBe(44);
    expect(SUBJECTIVE_RATINGS.reduce((n, row) => n + row.metrics.length, 0)).toBe(220);
  });
  test("BPC preserves exact four allowed labels/values and overall 92", () => {
    const row = entry();
    expect(researchSubjectiveRatings(row, [row])).toEqual({ slug: "bpc-157", name: "BPC-157", overall: 92, metrics: [{ label: "Healing Power", value: 96 }, { label: "Recovery Boost", value: 90 }, { label: "Gut Support", value: 88 }, { label: "Research Depth", value: 72 }] });
  });
  test("exact safety/suitability exclusions total 58 occurrences", () => {
    expect(subjectiveExclusions()).toEqual([
      { label: "Beginner-Friendly", count: 44 }, { label: "Safety Profile", count: 1 }, { label: "Blood Sugar Safety", count: 1 },
      { label: "Side-Effect Profile", count: 6 }, { label: "Side-Effect Severity", count: 1 }, { label: "Gentleness", count: 1 },
      { label: "UV Protection", count: 1 }, { label: "Works for M & F", count: 1 }, { label: "Convenience", count: 1 }, { label: "Ease of Use", count: 1 },
    ]);
    expect(subjectiveExclusions().reduce((n, x) => n + x.count, 0)).toBe(58);
  });
  test("every allowed score and overall is unchanged; excluded metrics never returned", () => {
    for (const source of SUBJECTIVE_RATINGS) {
      const row = entry({ id: source.slug, slug: source.slug, title: source.name });
      const result = researchSubjectiveRatings(row, [row]);
      expect(result?.metrics).toEqual(source.metrics.filter(m => !EXCLUDED_SUBJECTIVE_LABELS.some(label => label === m.label)));
      expect(result?.overall).toBe(source.overall);
    }
  });
  test("unpublished and absent records cannot show scores", () => {
    const row = entry({ published: false });
    expect(researchSubjectiveRatings(row, [row])).toBeUndefined();
    expect(researchSubjectiveRatings(undefined, [])).toBeUndefined();
    expect(researchSubjectiveRatings(entry(), [])).toBeUndefined();
  });
  test("exact source name and explicit saved alias work", () => {
    for (const row of [entry({ slug: "other" }), entry({ slug: "other", title: "Other", synonyms: ["BPC-157"] })]) expect(researchSubjectiveRatings(row, [row])?.overall).toBe(92);
  });
  test("no partial name, dose-stripping or inferred equivalence", () => {
    for (const name of ["BPC", "BPC-157 10mg", "CJC-1295 with DAC", "Human growth hormone"]) {
      const row = entry({ slug: "other", title: name });
      expect(researchSubjectiveRatings(row, [row])).toBeUndefined();
    }
  });
  test("duplicate published identities fail closed; unpublished duplicate does not leak", () => {
    const row = entry(); const duplicate = entry({ id: "duplicate", slug: "other" });
    expect(researchSubjectiveRatings(row, [row, duplicate])).toBeUndefined();
    expect(researchSubjectiveRatings(row, [row, { ...duplicate, published: false }])?.overall).toBe(92);
  });
  test("conflicting source identities fail closed", () => {
    const row = entry({ slug: "hgh", title: "Somatropin" });
    expect(researchSubjectiveRatings(row, [row])).toBeUndefined();
  });
  test("ratings never populate seven regimen fields or Titan ratings", () => {
    const row = entry(); researchSubjectiveRatings(row, [row]);
    expect(researchDetailModel(row).quick.slice(1).map(x => x.value)).toEqual(["—", "—", "—"]);
    expect(researchDetailModel(row).protocol.map(x => x.value)).toEqual(["—", "—", "—", "—"]);
    expect(researchDetailModel(row).ratings.map(x => x.value)).toEqual(["—", "—", "—"]);
    for (const source of SUBJECTIVE_RATINGS) expect(Object.keys(source).sort()).toEqual(["metrics", "name", "overall", "slug"]);
  });
  test("saved science, evidence, references, and factual counts are untouched", () => {
    const row = entry({ summary: "Saved cautious summary", at_a_glance: "Saved overview", evidence_status: "preclinical", content: [{ heading: "Mechanism", body: "Saved qualified context" }], source_references: [{ title: "Saved source", pmid: "123" }] });
    const before = JSON.stringify(row); researchSubjectiveRatings(row, [row]);
    expect(JSON.stringify(row)).toBe(before);
    expect(researchDetailModel(row).counts).toEqual({ references: 1, notes: 1, findings: 0 });
  });
  test("34 ready and 10 held descriptions remain independent", () => {
    expect(RESEARCH_SOURCE_DESCRIPTIONS.length).toBe(34); expect(HELD_RESEARCH_SOURCE_DESCRIPTIONS.length).toBe(10);
    const row = entry({ id: "ipa", slug: "ipamorelin", title: "Ipamorelin" });
    expect(researchSubjectiveRatings(row, [row])?.overall).toBe(87);
    expect(researchSourceDescription(row, [row])).toBeUndefined();
  });
});