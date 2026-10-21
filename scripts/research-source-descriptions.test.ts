import { describe, expect, test } from "bun:test";
import { HELD_RESEARCH_SOURCE_DESCRIPTIONS, RESEARCH_SOURCE_DESCRIPTIONS, researchSourceDescription } from "../src/lib/research-source-descriptions";
import { toResearchEntry } from "../src/lib/research";

const entry = (overrides: Record<string, unknown> = {}) => toResearchEntry({ id: "bpc", slug: "bpc-157", title: "BPC-157", published: true, ...overrides });

describe("Owner-supplied research source descriptions", () => {
  test("exactly 34 ready quotations", () => expect(RESEARCH_SOURCE_DESCRIPTIONS).toHaveLength(34));
  test("BPC nickname is the supplied Repair Crew", () => {
    const row = entry();
    expect(researchSourceDescription(row, [row])?.nick).toBe("The Repair Crew");
  });
  test("BPC quotation remains exact", () => {
    const row = entry();
    expect(researchSourceDescription(row, [row])?.one).toBe("A 15-amino-acid healing peptide that tells your body to rebuild damaged tissue faster.");
  });
  test("exact known slug matches without a matching title", () => {
    const row = entry({ title: "Body protection compound" });
    expect(researchSourceDescription(row, [row])?.slug).toBe("bpc-157");
  });
  test("exact stored name alias matches", () => {
    const row = entry({ slug: "other", title: "Other", synonyms: [" BPC-157 "] });
    expect(researchSourceDescription(row, [row])?.slug).toBe("bpc-157");
  });
  test("unpublished research never receives a source description", () => {
    const row = entry({ published: false });
    expect(researchSourceDescription(row, [row])).toBeUndefined();
  });
  test("unpublished aliases do not block one unique public match", () => {
    const row = entry();
    expect(researchSourceDescription(row, [row, entry({ id: "private", published: false })])?.slug).toBe("bpc-157");
  });
  test("ambiguous published research fails closed", () => {
    const row = entry();
    expect(researchSourceDescription(row, [row, entry({ id: "duplicate" })])).toBeUndefined();
  });
  test("multiple source identities fail closed", () => {
    const row = entry({ synonyms: ["TB-500"] });
    expect(researchSourceDescription(row, [row])).toBeUndefined();
  });
  test("no fuzzy or substring match", () => {
    const row = entry({ slug: "bpc-157-blend", title: "BPC-157 blend", synonyms: [] });
    expect(researchSourceDescription(row, [row])).toBeUndefined();
  });
  test("missing and absent-from-public-list entries fail closed", () => {
    expect(researchSourceDescription(undefined, [])).toBeUndefined();
    expect(researchSourceDescription(entry(), [])).toBeUndefined();
  });
  test("exactly ten held identities", () => expect(HELD_RESEARCH_SOURCE_DESCRIPTIONS).toHaveLength(10));
  for (const held of HELD_RESEARCH_SOURCE_DESCRIPTIONS) test(`${held.name} remains excluded`, () => {
    const row = entry({ slug: held.slug, title: held.name });
    expect(researchSourceDescription(row, [row])).toBeUndefined();
  });
  test("held identity cannot inherit a ready alias", () => {
    const row = entry({ slug: "epithalon", title: "Epithalon", synonyms: ["BPC-157"] });
    expect(researchSourceDescription(row, [row])).toBeUndefined();
  });
  test("presentation matching never changes saved scientific data or category", () => {
    const row = entry({ category: "Saved category", at_a_glance: "  **Laboratory only.**\nHuman efficacy remains unknown. ", summary: "Saved summary", content: [{ heading: "Research", body: "Original qualification" }], evidence_status: "preclinical", source_references: [{ title: "Saved reference" }] });
    const before = JSON.stringify(row);
    researchSourceDescription(row, [row]);
    expect(JSON.stringify(row)).toBe(before);
  });
});