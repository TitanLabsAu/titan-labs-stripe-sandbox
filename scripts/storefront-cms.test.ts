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
