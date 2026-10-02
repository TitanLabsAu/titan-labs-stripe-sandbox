import { describe, expect, test } from "bun:test";
import {
  filterBySection,
  normalizeCatalogueSection,
  parseCatalogueSection,
} from "./catalogue-sections";
import { validateReviewInput } from "./reviews";

describe("catalogue sections", () => {
  test("legacy/missing values fall back to range", () => {
    expect(normalizeCatalogueSection(undefined)).toBe("range");
    expect(normalizeCatalogueSection("Peptides")).toBe("range");
    expect(normalizeCatalogueSection("PENS")).toBe("pens");
  });
  test("server parsing defaults to range and rejects unknown", () => {
    expect(parseCatalogueSection(undefined)).toBe("range");
    expect(parseCatalogueSection("equipment")).toBe("equipment");
    expect(() => parseCatalogueSection("weapons")).toThrow();
  });
  test("filters products by section", () => {
    const items = [
      { n: "a", catalogueSection: "range" as const },
      { n: "b", catalogueSection: "pens" as const },
      { n: "c" },
    ];
    expect(filterBySection(items, "range").map((i) => i.n)).toEqual(["a", "c"]);
    expect(filterBySection(items, "pens").map((i) => i.n)).toEqual(["b"]);
    expect(filterBySection(items, "equipment")).toEqual([]);
  });
});

describe("review validation", () => {
  test("requires name and text, trims, optional fields", () => {
    expect(() => validateReviewInput({ reviewer_name: " ", review_text: "x" })).toThrow();
    expect(() => validateReviewInput({ reviewer_name: "A", review_text: "" })).toThrow();
    const r = validateReviewInput({ reviewer_name: " Sam ", review_text: " Great ", location: "" });
    expect(r).toMatchObject({ reviewer_name: "Sam", review_text: "Great", location: null, rating: null, published: false });
  });
  test("rating must be 1-5", () => {
    expect(() => validateReviewInput({ reviewer_name: "A", review_text: "B", rating: 6 })).toThrow();
    expect(validateReviewInput({ reviewer_name: "A", review_text: "B", rating: 4 }).rating).toBe(4);
  });
});
