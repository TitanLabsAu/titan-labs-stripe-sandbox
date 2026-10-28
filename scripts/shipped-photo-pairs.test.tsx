import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import pairs from "../src/lib/product-theme-pairs.json";
import {
  productDarkPhoto,
  productLightPhoto,
  shippedPhotoPair,
} from "../src/lib/theme-image-rules";
import { productImageDelivery } from "../src/lib/product-image-delivery";
import {
  ThemedProductImage,
  ThemedContentImage,
} from "../src/components/ThemedImage";
function render(child: ReturnType<typeof createElement>) {
  const client = new QueryClient();
  client.setQueryData(["site-content"], {});
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client }, child),
  );
}
describe("missing catalogue image pairs", () => {
  test("all 12 exact current sources have different dark/light images, including every colour", () => {
    expect(pairs).toHaveLength(12);
    expect(
      pairs.filter((p) => p.slug === "titan-v2-reusable-pen"),
    ).toHaveLength(3);
    expect(pairs.filter((p) => p.slug === "v2-reusable-pen")).toHaveLength(3);
    expect(
      pairs.filter((p) => p.slug === "travel-case-with-ice-pack"),
    ).toHaveLength(2);
    for (const pair of pairs) {
      expect(pair.dark).not.toBe(pair.light);
      for (const variant of [undefined, "selected-colour"]) {
        expect(productLightPhoto(pair.slug, pair.source, variant)).toBe(
          pair.light,
        );
      }
      expect(productDarkPhoto(pair.slug, pair.source)).toBe(pair.dark);
      expect(
        productLightPhoto(
          pair.slug,
          `https://titanlabsaus.com${pair.source}`,
          undefined,
        ),
      ).toBe(pair.light);
      expect(
        productDarkPhoto(pair.slug, `https://titanlabsaus.com${pair.source}`),
      ).toBe(pair.dark);
    }
  });
  test("new Admin uploads and other origins/products never receive stale shipped artwork", () => {
    for (const pair of pairs) {
      const replacement = `/api/public/product-image?path=${pair.slug}%2Fnew-upload.png`;
      expect(productDarkPhoto(pair.slug, replacement)).toBe(replacement);
      expect(
        productLightPhoto(pair.slug, replacement, "selected-colour"),
      ).toBeNull();
      expect(
        productLightPhoto("different-product", pair.source, "selected-colour"),
      ).toBeNull();
      expect(
        shippedPhotoPair(`https://unrelated.example${pair.source}`, pair.slug),
      ).toBeUndefined();
    }
  });
  test("saved Admin light photo overrides still take precedence", () => {
    for (const pair of pairs) {
      expect(
        productLightPhoto(pair.slug, pair.source, undefined, [
          { slug: pair.slug, image: "/custom-light.webp" },
        ]),
      ).toBe("/custom-light.webp");
      expect(
        productLightPhoto(
          pair.slug,
          pair.source,
          "blue",
          [],
          [
            {
              slug: pair.slug,
              variant_id: "blue",
              source: pair.source,
              image: "/variant-light.webp",
            },
          ],
        ),
      ).toBe("/variant-light.webp");
      expect(
        productLightPhoto(
          pair.slug,
          pair.source,
          "blue",
          [],
          [],
          [{ source: pair.source, image: "/exact-light.webp" }],
        ),
      ).toBe("/exact-light.webp");
    }
  });
  test("every generated full-size and 480px WebP exists and delivery never invents a rendition of an Admin upload", () => {
    for (const path of new Set(
      pairs
        .flatMap((p) => [p.dark, p.light])
        .filter((p) => p.startsWith("/images/product-theme/")),
    )) {
      for (const file of [path, path.replace(/\.webp$/, "-480.webp")]) {
        const data = readFileSync(`public${file}`);
        expect(data.subarray(0, 4).toString()).toBe("RIFF");
        expect(data.subarray(8, 12).toString()).toBe("WEBP");
      }
      expect(productImageDelivery(path, "180px").srcSet).toContain(
        "-480.webp 480w",
      );
    }
    expect(
      productImageDelivery("/api/public/product-image?path=new.png", "180px"),
    ).toEqual({});
  });
  test("catalogue/colour images render both correct variants from the first server paint", () => {
    for (const pair of pairs) {
      const html = render(
        createElement(ThemedProductImage, {
          slug: pair.slug,
          src: pair.source,
          variantId: "colour",
          alt: "Product",
          sizes: "180px",
        }),
      );
      expect(html).toContain(`src="${pair.dark}"`);
      expect(html).toContain(`src="${pair.light}"`);
      expect(html).toContain('data-theme-variant="dark"');
      expect(html).toContain('data-theme-variant="light"');
      const content = render(
        createElement(ThemedContentImage, { src: pair.source, alt: "Gallery" }),
      );
      expect(content).toContain(`src="${pair.dark}"`);
      expect(content).toContain(`src="${pair.light}"`);
    }
  });
});
