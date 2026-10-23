import { describe, expect, test } from "bun:test";
import { guideNavLabel } from "../src/lib/storefrontContent";

describe("Guides nav label", () => {
  test("saved legacy Pen Guides entry for /pen-guide renders as Guides", () => {
    expect(guideNavLabel("Pen Guides", "/pen-guide")).toBe("Guides");
    expect(guideNavLabel(" Titan Pen Guides ", "/pen-guide/")).toBe("Guides");
  });
  test("other labels and links are untouched", () => {
    expect(guideNavLabel("Pen Guides", "/pens")).toBe("Pen Guides");
    expect(guideNavLabel("Reviews", "/reviews")).toBe("Reviews");
    expect(guideNavLabel("Learn about pens", "/pen-guide")).toBe("Learn about pens");
  });
});
