import { describe, expect, test } from "bun:test";
import {
  getProductOption,
  isValidPackSizeInput,
  packLabel,
  parsePackSizeInput,
  sanitizePackSize,
  type Product,
} from "../src/lib/products";

const pins: Product = {
  slug: "demo-pen-pins",
  name: "DEMO Pen Pins",
  price: 5,
  image: "",
  alt: "",
  blurb: "",
  details: [],
  catalogueSection: "equipment",
  variants: [
    { id: "p5", label: "5mm 31g Pen Needles", price: 5, stock: 3, packSize: 10 },
    { id: "legacy", label: "Single needle", price: 1, stock: 4 },
    { id: "dup", label: "10 x 8mm 31g Pen Needles", price: 6, stock: 2, packSize: 10 },
  ],
};

describe("equipment quantity packs", () => {
  test("pack price is for the whole pack; never a 10x kit", () => {
    const o = getProductOption(pins, "p5", "kit");
    expect(o.pack).toBe("single");
    expect(o.unitPrice).toBe(5);
    expect(o.variantLabel).toBe("10 x 5mm 31g Pen Needles");
    expect(o.stock).toBe(3); // stock is counted in sellable packs
    expect(o.unitPrice * 2).toBe(10); // 2 packs = $10 (20 items), no kit discount
  });
  test("legacy options default to one item and keep their label", () => {
    expect(getProductOption(pins, "legacy").variantLabel).toBe("Single needle");
    expect(sanitizePackSize(undefined)).toBe(1);
  });
  test("does not duplicate a quantity already in the name", () => {
    expect(packLabel("10 x 8mm 31g Pen Needles", 10)).toBe("10 x 8mm 31g Pen Needles");
    expect(packLabel("10× pins", 10)).toBe("10 x pins");
    expect(packLabel("10 x 5mm Pen Pins", 20)).toBe("20 x 5mm Pen Pins");
    expect(packLabel("10 x 5mm Pen Pins", 10)).toBe("10 x 5mm Pen Pins");
    expect(packLabel("10 x 5mm Pen Pins", 1)).toBe("10 x 5mm Pen Pins");
  });
  test("untrusted stored values fall back to 1", () => {
    for (const bad of [0, -3, 2.5, "abc", 5000, null]) expect(sanitizePackSize(bad)).toBe(1);
    expect(sanitizePackSize(10)).toBe(10);
  });
  test("admin input is rejected rather than silently fixed", () => {
    expect(parsePackSizeInput("10")).toBe(10);
    expect(parsePackSizeInput("")).toBe(1);
    for (const bad of ["0", "-1", "2.5", "1001", "ten"]) {
      expect(isValidPackSizeInput(bad)).toBe(false);
      expect(() => parsePackSizeInput(bad, "Pins")).toThrow(/Items per pack/);
    }
  });
  test("range kits are untouched", () => {
    const range: Product = { ...pins, catalogueSection: "range", variants: [{ id: "a", label: "5mg", price: 50, stock: 20 }] };
    const kit = getProductOption(range, "a", "kit");
    expect(kit.pack).toBe("kit");
    expect(kit.unitPrice).toBe(400);
  });
});
