import { describe, expect, test } from "vitest";
import { cmsKey, cmsValues, isSafeUrl, mergeSectionChanges, validateSection, fillTokens } from "../src/lib/storefrontContent";

describe("storefront CMS", () => {
  test("link safety", () => {
    for (const ok of ["/range", "/api/public/product-image?path=a", "https://x.com", "http://x.com", ""]) expect(isSafeUrl(ok)).toBe(true);
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.com", "/\\evil", "ftp://x", " vbscript:x"]) expect(isSafeUrl(bad)).toBe(false);
  });
  test("rejects unknown keys, bad types and long text", () => {
    expect(() => validateSection("home_offer", { nope: "x" })).toThrow();
    expect(() => validateSection("home_offer", { visible: "yes" })).toThrow();
    expect(() => validateSection("home_offer", { text: "x".repeat(201) })).toThrow();
    expect(() => validateSection("nav_footer", { links: [{ label: "x", url: "javascript:1", visible: true }] })).toThrow();
    expect(() => validateSection("bogus", {})).toThrow();
  });
  test("missing uses default, empty string is deliberate", () => {
    expect(cmsValues({}, "home_testing").caption).toBe("Illustrative image");
    expect(cmsValues({ [cmsKey("home_testing")]: JSON.stringify({ caption: "" }) }, "home_testing").caption).toBe("");
    expect(cmsValues({ [cmsKey("home_testing")]: "not json" }, "home_testing").caption).toBe("Illustrative image");
  });
  test("merge keeps other fields and detects conflicts", () => {
    const current = JSON.stringify({ headline: "Theirs", caption: "Kept" });
    expect(mergeSectionChanges("home_testing", current, { eyebrow: "Mine" }, { eyebrow: "TESTING TRANSPARENCY" })).toEqual({ headline: "Theirs", caption: "Kept", eyebrow: "Mine" });
    expect(() => mergeSectionChanges("home_testing", current, { headline: "Mine" }, { headline: "Confidence starts with the certificate." })).toThrow(/changed by someone else/);
  });
  test("tokens", () => {
    expect(fillTokens("{percent}% off {x}", { percent: 10 })).toBe("10% off {x}");
  });
});

import { pageSectionOrder, HOME_SECTIONS } from "../src/lib/homeContent";
import { assertResetBase, canonicalUrl, visibleCmsLinks } from "../src/lib/storefrontContent";

describe("homepage order compatibility", () => {
  const order = (saved?: string) => pageSectionOrder(saved === undefined ? {} : { home_layout_order: saved }, "home_layout_order", HOME_SECTIONS);
  test("default keeps offer above heading and testing after pillars", () => {
    const o = order();
    expect(o.slice(0, 3)).toEqual(["offer", "page-heading", "tagline"]);
    expect(o[o.indexOf("pillars") + 1]).toBe("testing");
  });
  test("legacy saved order (no offer/heading/testing) keeps relative order", () => {
    const o = order("featured,tagline,headline,pillars,signup,intro");
    expect(o).toEqual(["offer", "page-heading", "featured", "tagline", "headline", "pillars", "testing", "signup", "intro", "shipping", "range-button", "pictures"]);
  });
  test("saved order with offer moved keeps it; heading goes to the top", () => {
    const o = order("tagline,offer,pillars,testing");
    expect(o[0]).toBe("page-heading");
    expect(o.indexOf("offer")).toBeGreaterThan(o.indexOf("tagline"));
    expect(o.indexOf("testing")).toBe(o.indexOf("pillars") + 1);
  });
  test("explicitly saved heading position is respected", () => {
    expect(order("tagline,page-heading,offer").slice(0, 3)).toEqual(["tagline", "page-heading", "offer"]);
  });
  test("unknown keys dropped, no duplicates", () => {
    const o = order("bogus,tagline,tagline");
    expect(o.includes("bogus" as never)).toBe(false);
  });
});

describe("structured link lists", () => {
  test("header links: order, visibility, unsafe and blank filtered, trimmed", () => {
    const links = [
      { label: "B", url: "/b", visible: true },
      { label: "Hidden", url: "/h", visible: false },
      { label: " A ", url: " https://a.com/x ", visible: true },
      { label: "", url: "/empty", visible: true },
      { label: "Bad", url: "javascript:alert(1)", visible: true },
    ];
    expect(visibleCmsLinks(links)).toEqual([{ label: "B", url: "/b" }, { label: "A", url: "https://a.com/x" }]);
    expect(visibleCmsLinks(undefined)).toEqual([]);
    expect(() => validateSection("nav_header", { links: Array.from({ length: 7 }, () => ({ label: "x", url: "/x", visible: true })) })).toThrow();
    expect(validateSection("nav_header", { links: [{ label: "x", url: "/x", visible: true }] })).toBeTruthy();
  });
  test("hardened URLs", () => {
    for (const bad of ["/a\\b", "/a\u0000b", "java\nscript:alert(1)", "\tjavascript:x", "https:/\\evil.com", "https:evil.com", "/a b", "data:image/png;base64,x"]) expect(canonicalUrl(bad)).toBeNull();
    expect(canonicalUrl("  /range ")).toBe("/range");
  });
  test("choice field validated", () => {
    expect(() => validateSection("home_reviews", { speed: "warp" })).toThrow();
    expect(validateSection("home_reviews", { speed: "slow", autoplay: false })).toEqual({ speed: "slow", autoplay: false });
  });
  test("reset refuses when content changed since editor snapshot", () => {
    const shown = cmsValues({}, "home_offer");
    expect(() => assertResetBase("home_offer", JSON.stringify({ visible: false }), shown)).toThrow(/changed by someone else/);
    expect(() => assertResetBase("home_offer", undefined, shown)).not.toThrow();
  });
});
