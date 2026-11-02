import { describe, expect, test } from "bun:test";
import {
  productHighlights,
  hasPhotoColourOptions,
  isPenGallery,
  type GalleryEntry,
} from "../src/lib/product-gallery";
import {
  cmsValues,
  cmsKey,
  validateSection,
  mergeSectionChanges,
} from "../src/lib/storefrontContent";
import type { Product } from "../src/lib/products";
const p = {
  id: "p1",
  slug: "titan-v2-reusable-pen",
  name: "Titan V2 Reusable Pen",
  catalogueSection: "equipment",
  image: "/main.webp",
  variants: [
    { id: "blue", label: "Blue", price: 40, image: "/blue.webp" },
    { id: "purple", label: "Purple", price: 40, image: "/purple.webp" },
  ],
} as Product;
const row = (
  product: string,
  variant: string,
  image1: string,
): GalleryEntry => ({ product, variant, image1, image2: "", image3: "" });
describe("three product highlights", () => {
  test("exactly three pen views belong to the selected colour", () => {
    for (const variant of p.variants!) {
      const photos = productHighlights(p, variant);
      expect(photos).toHaveLength(3);
      expect(photos.map((v) => v.label)).toEqual([
        "Full pen view",
        "Dial close-up",
        "Logo close-up",
      ]);
      expect(photos.every((v) => v.src === variant.image)).toBe(true);
      expect(photos.map((v) => v.scale)).toEqual([1, 3.5, 4]);
    }
  });
  test("a new main/variant upload is used immediately by every automatic highlight", () => {
    const variant = { ...p.variants![0], image: "/new-blue.webp" };
    expect(
      productHighlights(p, variant).every((v) => v.src === "/new-blue.webp"),
    ).toBe(true);
    expect(
      productHighlights({ ...p, image: "/new-main.webp" }, undefined).every(
        (v) => v.src === "/new-main.webp",
      ),
    ).toBe(true);
  });
  test("custom galleries bind stable product ID and exact colour, never a neighbouring product/colour", () => {
    const entries = [
      row("p1", "blue", "/blue-custom.webp"),
      row("p1", "", "/parent-blue.webp"),
      row("another", "purple", "/wrong.webp"),
    ];
    expect(productHighlights(p, p.variants![0], entries)[0].src).toBe(
      "/blue-custom.webp",
    );
    expect(productHighlights(p, p.variants![1], entries)[0].src).toBe(
      "/purple.webp",
    );
    expect(
      productHighlights({ ...p, slug: "renamed" }, p.variants![0], entries)[0]
        .src,
    ).toBe("/blue-custom.webp");
  });
  test("missing slots fall back individually; unsafe custom URLs cannot execute", () => {
    const photos = productHighlights(p, p.variants![0], [
      {
        ...row("p1", "blue", "/full.webp"),
        image2: "javascript:alert(1)",
        image3: "/logo.webp",
      },
    ]);
    expect(photos.map((v) => v.src)).toEqual([
      "/full.webp",
      "/blue.webp",
      "/logo.webp",
    ]);
    expect(photos[2].scale).toBe(1);
  });
  test("other products receive only their own full and detail views", () => {
    const kit = {
      ...p,
      name: "Pen Starter Kit",
      slug: "pen-starter-kit",
      catalogueSection: "equipment",
      variants: [],
    } as Product;
    expect(isPenGallery(kit)).toBe(false);
    expect(productHighlights(kit, undefined).map((v) => v.label)).toEqual([
      "Full product view",
    ]);
    expect(
      productHighlights(kit, undefined).every((v) => v.src === kit.image),
    ).toBe(true);
  });
  test("photo selectors require complete authentic colour photos, sizes keep their selectors", () => {
    expect(hasPhotoColourOptions(p.variants!)).toBe(true);
    expect(
      hasPhotoColourOptions([
        { id: "20", label: "20mg", price: 100, image: "/vial.webp" },
      ]),
    ).toBe(false);
    expect(
      hasPhotoColourOptions([
        { ...p.variants![0], image: null },
        p.variants![1],
      ]),
    ).toBe(false);
  });
  test("CMS validates all slots and conflict guard prevents overwriting another gallery edit", () => {
    const items = [row("p1", "blue", "/full.webp")];
    expect(validateSection("product_galleries", { items })).toEqual({ items });
    expect(() =>
      validateSection("product_galleries", {
        items: [{ ...items[0], image2: "javascript:x" }],
      }),
    ).toThrow();
    const raw = JSON.stringify({ items });
    expect(() =>
      mergeSectionChanges(
        "product_galleries",
        raw,
        { items: [] },
        { items: [] },
      ),
    ).toThrow();
    expect(
      cmsValues({ [cmsKey("product_galleries")]: raw }, "product_galleries")
        .items,
    ).toEqual(items);
  });
});

test("Range uses the new coordinated set rather than stale saved artwork", () => {
  const vial = {
    ...p,
    slug: "retatrutide",
    name: "Retatrutide",
    catalogueSection: "range",
    variants: [],
  } as Product;
  const entries = [
    {
      product: "p1",
      variant: "",
      image1: "/box-main.webp",
      image2: "/label.webp",
      image3: "/box.webp",
      light1: "/box-light.webp",
    },
  ];
  const photos = productHighlights(vial, undefined, entries);
  expect(photos).toHaveLength(3);
  expect(photos[0]).toEqual({
    src: vial.image,
    label: "Full product",
    rangeView: "vial",
    scale: 1,
    x: 0.5,
    y: 0.5,
    custom: false,
  });
  expect(isPenGallery(vial)).toBe(false);
});

test("only V2 reusable pens keep three photos, regardless of catalogue listing", () => {
  for (const catalogueSection of ["pens", "equipment", "range"] as const) {
    expect(
      productHighlights({ ...p, catalogueSection }, p.variants![0]),
    ).toHaveLength(3);
  }
  for (const item of [
    {
      ...p,
      slug: "retatrutide-20mg-disposable-pen",
      name: "Retatrutide disposable pen",
      catalogueSection: "pens",
    },
    {
      ...p,
      slug: "v2-pen-kit",
      name: "Pen Reconstitution Kit",
      catalogueSection: "equipment",
    },
    {
      ...p,
      slug: "travel-case-with-ice-pack",
      name: "Travel Case with Ice Pack",
      catalogueSection: "equipment",
    },
  ] as Product[]) {
    expect(isPenGallery(item)).toBe(false);
    expect(
      productHighlights(item, item.variants![0], [
        {
          ...row("p1", "blue", "/wrong.webp"),
          image2: "/label.webp",
          image3: "/box.webp",
        },
      ]),
    ).toHaveLength(1);
    expect(productHighlights(item, item.variants![0])[0].src).toBe(
      "/blue.webp",
    );
  }
});

test("existing saved gallery rows remain valid without optional light fields", () => {
  const items = [row("p1", "blue", "/full.webp")];
  expect(
    cmsValues(
      { [cmsKey("product_galleries")]: JSON.stringify({ items }) },
      "product_galleries",
    ).items,
  ).toEqual(items);
  expect(() =>
    validateSection("product_galleries", {
      items: [{ ...items[0], light1: "javascript:x" }],
    }),
  ).toThrow();
});

