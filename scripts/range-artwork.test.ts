import { describe, expect, test } from "bun:test";
import { rangeLabelDetails, usesRangeArtwork } from "../src/lib/range-artwork";
import { productHighlights } from "../src/lib/product-gallery";
import type { Product } from "../src/lib/products";

const product = {
  slug: "retatrutide",
  name: "Retatrutide",
  catalogueSection: "range",
  image: "/old.webp",
} as Product;
describe("matching Range artwork", () => {
  test("each selected size owns its label, including non-mg units and blends", () => {
    for (const label of ["10mg", "20mg", "30mg", "10IU", "3ml", "5mg / 5mg"])
      expect(rangeLabelDetails(product, { label }).strength).toBe(label);
    expect(rangeLabelDetails({ name: "NAD+ 1000mg" })).toEqual({
      name: "NAD+",
      strength: "1000mg",
    });
    expect(
      rangeLabelDetails({ name: "GHK-Cu 50mg" }, { label: "100mg" }),
    ).toEqual({ name: "GHK-Cu", strength: "100mg" });
    expect(rangeLabelDetails({ name: "BPC-157" })).toEqual({
      name: "BPC-157",
      strength: "",
    });
    expect(rangeLabelDetails(product, { label: "10 x 20mg" }).strength).toBe(
      "20mg",
    );
    expect(
      rangeLabelDetails({ name: "Retatrutide 20mg" }, { label: "40" }).strength,
    ).toBe("40");
  });
  test("bare size uses a unit only when the exact same quantity is saved in the product name", () => {
    expect(
      rangeLabelDetails({ name: "KLOW 80mg" }, { label: "80" }).strength,
    ).toBe("80mg");
    expect(
      rangeLabelDetails({ name: "HGH 36IU" }, { label: "36" }).strength,
    ).toBe("36IU");
  });
  test("every Range product receives three real compositions; sizes retain the selected identity", () => {
    for (const slug of [
      "retatrutide",
      "tirzepatide",
      "bpc-157",
      "nad",
      "hgh",
      "new-range-product",
    ]) {
      const variant = {
        id: "selected",
        label: "40mg",
        price: 10,
        image: "/selected.webp",
      };
      const views = productHighlights({ ...product, slug }, variant);
      expect(views.map((x) => x.rangeView)).toEqual(["vial", "label", "boxed"]);
      expect(views.every((x) => x.src === variant.image && x.scale === 1)).toBe(
        true,
      );
    }
  });
  test("Equipment, pens and secondary Range listings retain authentic photos", () => {
    for (const catalogueSection of ["pens", "equipment"] as const)
      expect(
        usesRangeArtwork({
          ...product,
          catalogueSection,
          extraSections: ["range"],
        } as Product),
      ).toBe(false);
    expect(
      usesRangeArtwork({
        ...product,
        slug: "titan-v2-reusable-pen",
        name: "Titan V2 Reusable Pen",
      }),
    ).toBe(false);
  });
});
