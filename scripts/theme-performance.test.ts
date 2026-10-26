import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { THEME_BOOT_SCRIPT, THEME_STORAGE_KEY, readStoredTheme, subscribeTheme, getThemeSnapshot } from "../src/lib/site-theme";
import { artDelivery } from "../src/lib/theme-art";

describe("theme boot", () => {
  test("boot script defaults to light, preserves saved dark, and survives storage errors", () => {
    const run = (stored: string | null, throws = false) => {
      const classes = new Set(["dark"]);
      const el = { classList: { remove: (c: string) => classes.delete(c), add: (c: string) => classes.add(c) }, dataset: {} as Record<string, string> };
      const ls = { getItem: (k: string) => { if (throws) throw new Error("blocked"); return k === THEME_STORAGE_KEY ? stored : null; } };
      new Function("localStorage", "document", THEME_BOOT_SCRIPT)(ls, { documentElement: el });
      return [...classes].join(",");
    };
    expect(run("light")).toBe("light");
    expect(run("dark")).toBe("dark");
    expect(run(null)).toBe("light");
    expect(run("light", true)).toBe("light");
  });
  test("storage reader is exception safe", () => {
    expect(readStoredTheme({ getItem: () => "light" })).toBe("light");
    expect(readStoredTheme({ getItem: () => { throw new Error("x"); } })).toBe("light");
    expect(readStoredTheme(null)).toBe("light");
  });
});

describe("theme store", () => {
  test("SSR snapshot defaults to light and subscribe is safe without window", () => {
    expect(getThemeSnapshot()).toBe("light");
    const off = subscribeTheme(() => {});
    off();
  });
});

describe("responsive art", () => {
  test("only shipped defaults get srcset, and every candidate exists", () => {
    expect(artDelivery("https://cdn.example/upload.webp", "100vw")).toEqual({});
    for (const src of ["/images/titan-discovery.webp", "/images/titan-discovery-light.webp", "/images/titan-testing-laboratory.webp", "/images/titan-testing-laboratory-1254-v2.webp", "/images/titan-testing-emblem.webp", "/images/product-light/testing-laboratory-light.webp", "/images/titan-membership-card.webp", "/images/titan-catalogue-banner.webp"]) {
      const d = artDelivery(src, "100vw");
      expect(d.srcSet).toBeTruthy();
      for (const part of d.srcSet!.split(",")) readFileSync(`public${part.trim().split(" ")[0]}`);
    }
  });
  test("themed pairs are CSS-switched so the hidden variant is display:none", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toContain("html:not(.light) .theme-variant-light, html.light .theme-variant-dark");
  });
});
