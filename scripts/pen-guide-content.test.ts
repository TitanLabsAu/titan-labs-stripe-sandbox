import { describe, expect, test } from "bun:test";
import { cmsValues, mergeSectionChanges } from "../src/lib/storefrontContent";

describe("Pen Guide editable source defaults", () => {
  test("retains the existing lower steps after the six supplied steps", () => {
    const guide = cmsValues(undefined, "guide_learning");
    expect(guide.reusable_steps).toHaveLength(8);
    expect(guide.disposable_steps).toHaveLength(7);
  });
  test("saved steps and column headings take precedence without mutating saved content", () => {
    const saved = { reusable_title: "Saved reusable", disposable_title: "Saved disposable", reusable_steps: [{ title: "Saved step", body: "Saved body" }] };
    const content = { "cms:guide_learning": JSON.stringify(saved) };
    const before = JSON.stringify(content);
    const resolved = cmsValues(content, "guide_learning");
    expect(resolved.reusable_title).toBe(saved.reusable_title);
    expect(resolved.disposable_title).toBe(saved.disposable_title);
    expect(resolved.reusable_steps).toEqual(saved.reusable_steps);
    expect(JSON.stringify(content)).toBe(before);
  });
  test("the existing conflict-aware editor accepts both dedicated column headings", () => {
    const base = cmsValues(undefined, "guide_learning");
    const updated = mergeSectionChanges("guide_learning", undefined, { reusable_title: "Edited reusable", disposable_title: "Edited disposable" }, base);
    expect(updated).toEqual({ reusable_title: "Edited reusable", disposable_title: "Edited disposable" });
  });
});