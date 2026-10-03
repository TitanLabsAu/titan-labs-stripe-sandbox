import { describe, expect, test } from "bun:test";
import { bundleSummary, sanitizeBundle } from "../src/lib/products";

describe("equipment bundles", () => {
  test("sanitizes contents and clamps quantities", () => {
    const out = sanitizeBundle([
      { slug: "bac-water", name: "BAC Water 10ml", quantity: 500 },
      { slug: "x", name: "", quantity: 2 },
      { slug: "pins", name: "Pen Pins", quantity: 0 },
    ]);
    expect(out).toEqual([
      { slug: "bac-water", name: "BAC Water 10ml", quantity: 99 },
      { slug: "pins", name: "Pen Pins", quantity: 1 },
    ]);
    expect(sanitizeBundle("bad")).toEqual([]);
  });
  test("summary text", () => {
    expect(bundleSummary([{ slug: "a", name: "Syringe", quantity: 2 }])).toBe("2 x Syringe");
    expect(bundleSummary(undefined)).toBe("");
  });
});
