import { describe, expect, test } from "bun:test";
import { SOURCE_TIERS, researchSourceTier } from "../src/lib/research-source-tiers";
import type { ResearchEntry } from "../src/lib/research";
const e = (o: Partial<ResearchEntry>) => ({ id: "1", slug: "bpc-157", title: "BPC-157", synonyms: [], published: true, ...o }) as ResearchEntry;
describe("source tiers", () => {
  test("44 exact owner tiers, only S/A/B/C", () => {
    expect(SOURCE_TIERS).toHaveLength(44);
    expect(SOURCE_TIERS.every(s => ["S", "A", "B", "C"].includes(s.tier))).toBe(true);
  });
  test("exact original tiers", () => {
    const one = (slug: string) => { const x = e({ slug, title: slug }); return researchSourceTier(x, [x]); };
    expect(one("bpc-157")).toBe("S"); expect(one("retatrutide")).toBe("S"); expect(one("ghk-cu")).toBe("A"); expect(one("ahk-cu")).toBe("B");
  });
  test("drafts, unknown and duplicate published destinations fail closed", () => {
    expect(researchSourceTier(e({ published: false }), [])).toBeUndefined();
    const u = e({ slug: "made-up", title: "Made Up" }); expect(researchSourceTier(u, [u])).toBeUndefined();
    const a = e({}), b = e({ id: "2", slug: "bpc-157-copy" });
    expect(researchSourceTier(a, [a, b])).toBeUndefined();
    expect(researchSourceTier(a, [a, e({ id: "3", published: false })])).toBe("S");
  });
});
