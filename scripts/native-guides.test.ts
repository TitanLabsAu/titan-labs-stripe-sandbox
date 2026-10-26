import { describe, expect, test } from "bun:test";
import { cmsKey, cmsValues, validateSection } from "../src/lib/storefrontContent";

const recon = cmsValues(undefined, "guide_reconstitution");
const admin = cmsValues(undefined, "guide_administration");

describe("native Reconstitution Kit guide defaults", () => {
  test("all six supplied steps are present in order with text and a photo", () => {
    expect(recon.steps.map((s: { title: string }) => s.title)).toEqual([
      "Prepare", "Draw BAC water", "Swap needle", "Transfer to peptide vial", "Mix gently", "Store correctly",
    ]);
    for (const s of recon.steps) {
      expect(s.body.length).toBeGreaterThan(20);
      expect(s.image).toMatch(/^\/__l5e\/assets-v1\//);
    }
  });
  test("kit contents, tips and note match the supplied document", () => {
    expect(recon.kit.map((k: { label: string }) => k.label)).toEqual([
      "1 × 3 mL Luer Lock Syringe", "1 × 38 mm Safety Hypodermic Needle", "2 × 16 mm Safety Hypodermic Needles", "1 × Alcohol Prep Pad",
    ]);
    expect(recon.tips).toHaveLength(6);
    expect(recon.note).toContain("vent needle");
    expect(recon.note).toContain("single use needles only");
    expect(recon.steps[5].body).toContain("2–8°C");
  });
});

describe("native Administration Kit guide defaults", () => {
  test("all seven supplied steps are present in order with text and a photo", () => {
    expect(admin.steps.map((s: { title: string }) => s.title)).toEqual([
      "Wash & prepare", "Check syringe", "Clean injection site", "Inject", "After injection", "Dispose safely", "Injection sites",
    ]);
    for (const s of admin.steps) {
      expect(s.body.length).toBeGreaterThan(20);
      expect(s.image).toMatch(/^\/__l5e\/assets-v1\//);
    }
  });
  test("kit contents, tips and remember note match the supplied document", () => {
    expect(admin.kit.map((k: { label: string }) => k.label)).toEqual(["5 × 1 mL Insulin Syringes", "5 × Alcohol Prep Wipes"]);
    expect(admin.tips).toHaveLength(6);
    expect(admin.note).toContain("Single use only");
    expect(admin.note).toContain("seek professional advice");
    expect(admin.steps[6].body).toContain("Rotate injection sites");
  });
});

describe("guide CMS validation", () => {
  test("valid overrides save; unknown keys and unsafe image URLs are rejected", () => {
    const ok = validateSection("guide_reconstitution", { title: "Saved title", steps: [{ title: "A", body: "B", image: "/__l5e/assets-v1/x/y.png" }] });
    expect(ok.title).toBe("Saved title");
    expect(() => validateSection("guide_reconstitution", { nope: 1 })).toThrow();
    expect(() => validateSection("guide_reconstitution", { steps: [{ title: "A", body: "B", image: "javascript:alert(1)" }] })).toThrow();
  });
  test("saved overrides win over defaults; untouched keys keep defaults", () => {
    const content = { [cmsKey("guide_administration")]: JSON.stringify({ title: "Saved admin guide" }) };
    const merged = cmsValues(content, "guide_administration");
    expect(merged.title).toBe("Saved admin guide");
    expect(merged.steps).toHaveLength(7);
  });
  test("the original full-page document fields remain as optional backup", () => {
    const docs = cmsValues(undefined, "guide_documents");
    expect(docs.reconstitution_image).toContain("titan-peptide-reconstitution-guide.png");
    expect(docs.administration_image).toContain("titan-administering-kit-usage-guide.png");
  });
});
