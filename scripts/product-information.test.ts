import { describe, expect, test } from "bun:test";
import {
  productInformation,
  type ProductInformationEntry,
} from "../src/lib/product-information";
import {
  cmsKey,
  cmsValues,
  validateSection,
  mergeSectionChanges,
} from "../src/lib/storefrontContent";
import type { Product } from "../src/lib/products";
const product = {
  id: "p1",
  slug: "vial",
  name: "Vial",
  description: "",
  details: [],
  protocol: "",
  links: [],
  variants: [],
} as Product;
const row: ProductInformationEntry = {
  product: "p1",
  details: "Details",
  included: "",
  care: "",
  shipping: "Ships Australia wide",
};
describe("editable product information", () => {
  test("no empty sections or invented inclusions", () => {
    expect(productInformation(product, undefined)).toEqual({
      details: "",
      included: "",
      care: "",
      shipping: "",
      documents: [],
    });
  });
  test("existing saved product descriptions and selected option contents survive without panel overrides", () => {
    const variant = {
      id: "blue",
      label: "Blue",
      price: 40,
      contents: [{ quantity: 1, name: "Ice pack" }],
    };
    const info = productInformation(
      {
        ...product,
        description: "Existing description",
        details: ["Key point"],
        protocol: "Saved care",
      },
      variant,
    );
    expect(info.details).toBe("Existing description\n\nKey point");
    expect(info.included).toBe("1 × Ice pack");
    expect(info.care).toBe("Saved care");
  });
  test("saved blank hides even when original product has content; stable ID survives slug changes", () => {
    const p = {
      ...product,
      slug: "renamed",
      description: "Do not show",
      protocol: "Do not show",
    };
    expect(
      productInformation(p, undefined, [{ ...row, details: "", care: "  " }]),
    ).toEqual({
      details: "",
      included: "",
      care: "",
      shipping: "Ships Australia wide",
      documents: [],
    });
  });
  test("other product panels never leak and unsafe document links stay hidden", () => {
    const p = {
      ...product,
      description: "Original",
      links: [{ label: "Bad", url: "javascript:alert(1)" }],
    };
    expect(
      productInformation(p, undefined, [{ ...row, product: "other" }]).details,
    ).toBe("Original");
    expect(productInformation(p, undefined).documents).toEqual([]);
  });
  test("server validates panel limits and rejects stale writes", () => {
    const items = [row];
    expect(validateSection("product_information", { items })).toEqual({
      items,
    });
    expect(() =>
      validateSection("product_information", {
        items: [{ ...row, care: "x".repeat(12001) }],
      }),
    ).toThrow();
    expect(() =>
      mergeSectionChanges(
        "product_information",
        JSON.stringify({ items }),
        { items: [] },
        { items: [] },
      ),
    ).toThrow();
    expect(
      cmsValues(
        { [cmsKey("product_information")]: JSON.stringify({ items }) },
        "product_information",
      ).items,
    ).toEqual(items);
  });
});
