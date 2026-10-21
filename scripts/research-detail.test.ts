import { describe, expect, test } from "bun:test";
import { researchDetailModel } from "../src/lib/research-detail";
import { toResearchEntry } from "../src/lib/research";

const row = toResearchEntry({ id: "fictional", title: "Fixture", category: "Saved class", at_a_glance: "**Laboratory only.**\nHuman efficacy unknown.", summary: "Complete saved summary", content: [{ heading: "Reported mechanism", body: "Original **qualified** mechanism.\nNot established in humans." }, { heading: "Research context", body: "Exact context." }, { heading: "Regulatory status", body: "Original restriction." }], research_findings: ["A saved finding; not a treatment claim."], source_references: [{ title: "Saved source" }, { title: "Another source" }] });
describe("Research detail presentation boundaries", () => {
  test("mechanism cards use only whole saved mechanism/context sections verbatim", () => {
    expect(researchDetailModel(row).mechanism).toEqual(row.content.slice(0, 2));
  });
  test("saved counts are actual references, notes and findings", () => {
    expect(researchDetailModel(row).counts).toEqual({ references: 2, notes: 3, findings: 1 });
  });
  test("blank route, half-life and cycle placeholders are omitted", () => {
    expect(researchDetailModel(row).quick).toEqual([{ label: "Class", value: "Saved class" }]);
  });
  test("blank protocol fields are omitted", () => {
    expect(researchDetailModel(row).protocol).toEqual([]);
  });
  test("ratings never derive clinical scores", () => {
    expect(researchDetailModel(row).ratings.map(item => item.value)).toEqual(["—", "—", "—"]);
  });
  test("full overview and findings preserve every qualification", () => {
    expect(researchDetailModel(row).overview).toBe(row.at_a_glance);
    expect(researchDetailModel(row).findings).toEqual(row.research_findings);
    expect(researchDetailModel({ ...row, at_a_glance: "" }).overview).toBe(row.summary);
  });
  test("presentation never mutates any saved field", () => {
    const before = JSON.stringify(row); researchDetailModel(row); expect(JSON.stringify(row)).toBe(before);
  });
});