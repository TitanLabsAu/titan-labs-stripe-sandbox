import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { artDelivery } from "../src/lib/theme-art";
import { CMS_SECTIONS } from "../src/lib/storefrontContent";

describe("page-scoped themed artwork and layout", () => {
  test("all FAQ rows share intrinsic equal heights without fixed clipping", () => {
    const css = readFileSync("src/styles.css", "utf8");
    const route = readFileSync("src/routes/pen-guide.tsx", "utf8");
    expect(css).toContain(".pen-faq-grid { grid-auto-rows: 1fr; align-items: stretch; }");
    expect(css).toContain(".pen-faq-card { height: 100%; overflow-wrap: anywhere; }");
    expect(route).toContain('className="pen-faq-card flex h-full min-w-0');
    expect(route).toContain("<ThemedArt dark={banner.dark} light={banner.light}");
    expect(css).toContain(".light .pen-guide-page :is(h1, h2, h3, h4, p, li, p span, li span, svg)");
  });
  test("Pen Guide light counterpart is optional and editable without changing dark artwork", () => {
    const guide = CMS_SECTIONS.find((s) => s.id === "guide_pages");
    expect(guide?.fields.some((f) => f.key === "banner_image_light" && f.type === "image")).toBe(true);
    expect(guide?.defaults.banner_image_light).toBe("");
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