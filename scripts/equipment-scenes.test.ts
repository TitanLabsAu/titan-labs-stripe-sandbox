import { describe, it, expect } from "bun:test";
import { existsSync } from "node:fs";
import entries from "../src/lib/equipment-scenes.json";
import {
  equipmentSceneFor,
  hasSceneOverride,
} from "../src/lib/equipment-scenes";

describe("Pens and Equipment photographic scenes", () => {
  it("covers every approved source with a real asset and keeps uploads source-bound", () => {
    expect(entries.length).toBe(24);
    expect(new Set(entries.flatMap((e) => e.slugs)).size).toBe(20);
    for (const e of entries) {
      expect(existsSync(`public${e.cutout}`)).toBe(true);
      expect(e.width).toBeGreaterThan(0);
      expect(e.height).toBeGreaterThan(0);
      for (const slug of e.slugs) {
        expect(equipmentSceneFor(slug, e.source)?.cutout).toBe(e.cutout);
        expect(
          equipmentSceneFor(slug, "/uploads/new-admin-photo.webp"),
        ).toBeUndefined();
      }
      expect(equipmentSceneFor("unrelated-product", e.source)).toBeUndefined();
    }
  });
  it("keeps the purple and grey pens and large starter kit separate", () => {
    const forSlug = (slug: string) =>
      entries.filter((e) => e.slugs.includes(slug));
    for (const slug of ["v2-reusable-pen", "titan-v2-reusable-pen"]) {
      expect(new Set(forSlug(slug).map((e) => e.cutout)).size).toBe(3);
    }
    expect(
      new Set(forSlug("range-starter-kit").map((e) => e.cutout)).size,
    ).toBe(2);
    expect(
      new Set(forSlug("travel-case-with-ice-pack").map((e) => e.cutout)).size,
    ).toBe(2);
  });
  it("recognizes optimized and canonical equivalents of the BAC source", () => {
    expect(
      equipmentSceneFor(
        "bac-water",
        "/images/product-optimized/bac-water.webp",
      ),
    ).toBeDefined();
    const e = entries[0]!;
    expect(
      equipmentSceneFor(e.slugs[0], `https://titanlabsaus.com${e.source}`)
        ?.cutout,
    ).toBe(e.cutout);
  });
  it("replaces only the three exact saved older kit alternates", () => {
    const older = entries.filter((e) => "previousLight" in e);
    expect(older).toHaveLength(3);
    for (const e of older) {
      const previous = (e as typeof e & { previousLight: string })
        .previousLight;
      expect(
        hasSceneOverride(
          e.slugs[0],
          e.source,
          undefined,
          [],
          [],
          [{ source: e.source, image: previous }],
          previous,
        ),
      ).toBe(false);
      expect(
        hasSceneOverride(
          e.slugs[0],
          e.source,
          undefined,
          [],
          [],
          [{ source: e.source, image: "/new-admin.webp" }],
          previous,
        ),
      ).toBe(true);
    }
  });
  it("preserves exact CMS overrides without borrowing a different variant", () => {
    const source = entries[0]!.source;
    expect(hasSceneOverride("v2-reusable-pen", source, "blue")).toBe(false);
    expect(
      hasSceneOverride(
        "v2-reusable-pen",
        source,
        "blue",
        [],
        [],
        [{ source, image: "/custom.webp" }],
      ),
    ).toBe(true);
    expect(
      hasSceneOverride("v2-reusable-pen", source, undefined, [
        { slug: "v2-reusable-pen", image: "/custom.webp" },
      ]),
    ).toBe(true);
    expect(
      hasSceneOverride(
        "v2-reusable-pen",
        source,
        "blue",
        [],
        [
          {
            slug: "v2-reusable-pen",
            variant_id: "purple",
            source,
            image: "/purple.webp",
          },
        ],
      ),
    ).toBe(false);
    expect(
      hasSceneOverride(
        "v2-reusable-pen",
        source,
        "blue",
        [],
        [
          {
            slug: "v2-reusable-pen",
            variant_id: "blue",
            source: "/different.webp",
            image: "/other.webp",
          },
        ],
      ),
    ).toBe(false);
    expect(
      hasSceneOverride(
        "v2-reusable-pen",
        source,
        "blue",
        [],
        [
          {
            slug: "v2-reusable-pen",
            variant_id: "blue",
            source,
            image: "/blue.webp",
          },
        ],
      ),
    ).toBe(true);
  });
});
