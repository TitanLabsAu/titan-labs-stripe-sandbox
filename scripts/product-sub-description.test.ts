import { describe, expect, test } from "bun:test";
import { getProductOption, subDescriptionFor, type Product } from "../src/lib/products";

const pen: Product = { slug: "reta-30", name: "Reta 30", price: 100, image: "", alt: "", blurb: "", details: [], catalogueSection: "pens", subDescription: "Pre-filled Pen Only" };

describe("product sub-description", () => {
  test("saved wording is shown", () => expect(subDescriptionFor(pen)).toBe("Pre-filled Pen Only"));
  test("cleared or whitespace renders nothing", () => {
    expect(subDescriptionFor({ ...pen, subDescription: "" })).toBe("");
    expect(subDescriptionFor({ ...pen, subDescription: "   " })).toBe("");
    expect(subDescriptionFor({ ...pen, subDescription: undefined })).toBe("");
  });
  test("edited text does not change the cart/order line label", () => {
    expect(getProductOption({ ...pen, subDescription: "Custom" }, null).variantLabel).toBe("Pre-filled Pen Only");
    expect(getProductOption({ ...pen, subDescription: "" }, null).variantLabel).toBe("Pre-filled Pen Only");
  });
});
