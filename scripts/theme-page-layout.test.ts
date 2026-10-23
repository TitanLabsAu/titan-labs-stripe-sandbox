import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { artDelivery } from "../src/lib/theme-art";
import { CMS_SECTIONS } from "../src/lib/storefrontContent";

describe("page-scoped themed artwork and layout", () => {
  test("promotion playback only calls the attached initialized plugin", () => {
    const strip = readFileSync("src/components/HotProductsStrip.tsx", "utf8");
    expect(strip).toContain("carousel.plugins().autoScroll");
    expect(strip).toContain("carousel.scrollSnapList().length <= 1");
    expect(strip).not.toContain("autoScroll.play()");
    expect(strip).not.toContain("autoScroll.stop()");
  });
  test("both finished light account images exist with WebP headers", () => {
    for (const path of ["titan-membership-card-light.webp", "titan-membership-card-light-960.webp"]) {
      const bytes = readFileSync(`public/images/${path}`);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
    }
  });
  test("Pen Guide rows size naturally with no fixed or equalized heights", () => {
    const css = readFileSync("src/styles.css", "utf8");
    const route = readFileSync("src/routes/pen-guide.tsx", "utf8");
    expect(css).not.toContain("pen-instruction-step { min-height");
    expect(css).not.toContain(".pen-faq-grid { grid-auto-rows");
    expect(route).not.toContain("auto-rows-fr");
    expect(route).toContain('className="pen-faq-card flex min-w-0');
    expect(route).toContain("<ThemedArt dark={banner.dark} light={banner.light}");
  });
  test("Pen Guide light counterpart is optional and editable without changing dark artwork", () => {
    const guide = CMS_SECTIONS.find((s) => s.id === "guide_pages");
    expect(guide?.fields.some((f) => f.key === "banner_image_light" && f.type === "image")).toBe(true);
    expect(guide?.defaults.banner_image_light).toBe("");
  });
  test("Pen Guide alone defaults to the original composition's light counterpart", () => {
    const route = readFileSync("src/routes/pen-guide.tsx", "utf8");
    expect(route).toContain('g.banner_image_light, "/images/titan-pen-guide-banner-light.webp"');
    expect(artDelivery("/images/titan-pen-guide-banner-light.webp", "100vw").srcSet).toBe("/images/titan-pen-guide-banner-light-960.webp 960w, /images/titan-pen-guide-banner-light.webp 1920w");
    for (const name of ["titan-pen-guide-banner-light.webp", "titan-pen-guide-banner-light-960.webp"]) {
      const bytes = readFileSync(`public/images/${name}`);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
    }
  });
  test("account counterpart has responsive delivery and unchanged dynamic name placement", () => {
    const card = readFileSync("src/components/TitanMemberCard.tsx", "utf8");
    expect(card).toContain('dark="/images/titan-membership-card.webp" light="/images/titan-membership-card-light.webp"');
    expect(artDelivery("/images/titan-membership-card-light.webp", "100vw").srcSet).toContain("titan-membership-card-light-960.webp 960w");
    expect(card).toContain("left-[59%] top-[70.5%] w-[34%]");
    expect(card).toContain("rotate-[5deg]");
    expect(card).toContain("sm:left-[73.5%] sm:w-[23%]");
    expect(card).toContain("{memberName}</p>");
  });
});