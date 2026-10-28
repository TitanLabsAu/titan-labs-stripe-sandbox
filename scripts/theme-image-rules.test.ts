import { describe, expect, test } from "vitest";
import {
  productLightPhoto,
  contentLightPhoto,
} from "../src/lib/theme-image-rules";

describe("theme photo identity", () => {
  test("a new Admin photo cannot be replaced by an old bundled light image", () => {
    const uploaded =
      "/api/public/product-image?path=range-starter-kit%2Fnew-upload.png";
    expect(
      productLightPhoto("range-starter-kit", uploaded, undefined),
    ).toBeNull();
    expect(
      productLightPhoto(
        "range-starter-kit",
        "/images/titan-range-starter-kit.webp",
        undefined,
      ),
    ).toBe("/images/product-light/titan-range-starter-kit.webp");
  });
  test("original optimised catalogue pairs still work", () => {
    expect(
      productLightPhoto(
        "retatrutide",
        "/images/product-optimized/retatrutide.webp",
        undefined,
      ),
    ).toBe("/images/product-light/retatrutide.webp");
    expect(
      productLightPhoto(
        "retatrutide",
        "/images/product-optimized/tirzepatide.webp",
        undefined,
      ),
    ).toBeNull();
  });
  test("colour variants never fall back to the parent or another colour", () => {
    const products = [{ slug: "v2", image: "/parent-light.webp" }];
    const variants = [
      {
        slug: "v2",
        variant_id: "purple",
        source: "/purple.webp",
        image: "/purple-light.webp",
      },
    ];
    expect(
      productLightPhoto("v2", "/purple.webp", "purple", products, variants),
    ).toBe("/purple-light.webp");
    expect(
      productLightPhoto("v2", "/blue.webp", "blue", products, variants),
    ).toBeNull();
    expect(
      productLightPhoto("v2", "/new-purple.webp", "purple", products, variants),
    ).toBeNull();
  });
  test("custom page pairs match the exact saved source including upload query", () => {
    const pairs = [
      {
        source: "/api/public/product-image?path=one.png",
        image: "/one-light.webp",
      },
    ];
    expect(
      contentLightPhoto(
        "https://titanlabsaus.com/api/public/product-image?path=one.png",
        pairs,
      ),
    ).toBe("/one-light.webp");
    expect(
      contentLightPhoto("/api/public/product-image?path=two.png", pairs),
    ).toBeNull();
    expect(
      contentLightPhoto(
        "https://elsewhere.example/api/public/product-image?path=one.png",
        pairs,
      ),
    ).toBeNull();
  });
});
