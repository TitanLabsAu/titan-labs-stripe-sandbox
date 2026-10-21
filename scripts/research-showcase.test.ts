import { describe, expect, test } from "bun:test";
import { researchShowcaseDescriptor, researchShowcaseStats } from "../src/lib/research-showcase";
import { toResearchEntry } from "../src/lib/research";

const e = (slug: string, title: string, extra: Record<string, unknown> = {}) => toResearchEntry({ id: slug, slug, title, published: true, ...extra });
describe("Research showcase card cells", () => {
  test("Retatrutide first three permitted opinion scores", () => {
    const r = e("retatrutide", "Retatrutide");
    expect(researchShowcaseStats(r, [r]).map(s => [s.val, s.label, s.fullLabel])).toEqual([[98, "FAT", "Fat Loss Power"], [96, "APPETI", "Appetite Control"], [90, "METABO", "Metabolic Boost"]]);
  });
  test("BPC-157 first three permitted opinion scores", () => {
    const b = e("bpc-157", "BPC-157");
    expect(researchShowcaseStats(b, [b]).map(s => [s.val, s.label])).toEqual([[96, "HEALIN"], [90, "RECOVE"], [88, "GUT"]]);
  });
  test("unpublished entries get no cells, never substituted counts", () => {
    const b = e("bpc-157", "BPC-157", { published: false });
    expect(researchShowcaseStats(b, [b])).toEqual([]);
  });
  test("Retatrutide shows descriptor, not a molecular formula", () => {
    expect(researchShowcaseDescriptor(e("retatrutide", "Retatrutide"))).toEqual({ kind: "descriptor", text: "GLP-1 / GIP / glucagon triple agonist" });
    expect(researchShowcaseDescriptor(e("kpv", "KPV"))).toBeUndefined();
  });
});
