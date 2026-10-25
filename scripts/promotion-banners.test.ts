import { describe, expect, test } from "bun:test";
import { DEFAULT_BANNERS, bannerSettingsSchema, contrastRatio, parseBannerSettings, resolveBanner, serialiseBannerSettings, type BannerSettings } from "../src/lib/promotion-banners";

const custom = { id: "custom-limited", label: "LIMITED EDITION", background: "#006DA8", text: "#FFFFFF" };
const empty: BannerSettings = { options: [], assignments: {} };
describe("promotion banner rules", () => {
  test("three approved defaults have accessible requested colours", () => {
    expect(DEFAULT_BANNERS.map(o => [o.label, o.background, o.text])).toEqual([["HOT PRODUCT", "#E9C365", "#031321"], ["FLASH SALE", "#BE123C", "#FFFFFF"], ["NEW PRODUCT", "#006DA8", "#FFFFFF"]]);
    for (const o of DEFAULT_BANNERS) expect(contrastRatio(o.background, o.text)).toBeGreaterThanOrEqual(4.5);
  });
  test("existing hot/flash/new map without re-entry and sales do not become hot", () => {
    expect(resolveBanner(empty, "reta::20", "Hot product", true, true)?.id).toBe("flash");
    expect(resolveBanner(empty, "reta::20", "Flash sale")?.id).toBe("flash");
    expect(resolveBanner(empty, "reta::20", "New product", true)?.id).toBe("new");
    expect(resolveBanner(empty, "reta::10", "", false, true)?.id).toBe("hot");
    expect(resolveBanner(empty, "reta::10", "") ).toBeNull();
  });
  test("save/read/add/edit/soft remove retains exact variant assignment", () => {
    let saved = serialiseBannerSettings({ options: [custom], assignments: { "reta::20": custom.id } });
    let read = parseBannerSettings(saved);
    expect(resolveBanner(read, "reta::20")?.label).toBe("LIMITED EDITION");
    expect(resolveBanner(read, "reta::10")).toBeNull();
    saved = serialiseBannerSettings({ ...read, options: [{ ...custom, label: "SPECIAL RELEASE" }] });
    read = parseBannerSettings(saved);
    expect(resolveBanner(read, "reta::20")?.label).toBe("SPECIAL RELEASE");
    read = parseBannerSettings(serialiseBannerSettings({ ...read, options: [{ ...custom, removed: true }] }));
    expect(read.assignments["reta::20"]).toBe(custom.id);
    expect(resolveBanner(read, "reta::20", "", true)?.id).toBe("flash");
  });
  test("invalid or deleted documents fall back safely", () => {
    expect(resolveBanner(parseBannerSettings('{"options":[],"assignments":{"reta::20":"deleted"}}'), "reta::20", "New product")?.id).toBe("new");
    expect(parseBannerSettings("bad")).toEqual(empty);
  });
  test.each([
    { ...custom, label: "X".repeat(25) }, { ...custom, background: "red;display:none" },
    { ...custom, text: "#006DA8" }, { ...custom, label: "HOT PRODUCT" },
  ])("rejects bounded labels, unsafe colours, low contrast and duplicate default labels", option => {
    expect(bannerSettingsSchema.safeParse({ options: [option], assignments: {} }).success).toBe(false);
  });
  test("duplicate custom IDs and case-insensitive labels rejected", () => {
    expect(bannerSettingsSchema.safeParse({ options: [custom, custom], assignments: {} }).success).toBe(false);
    expect(bannerSettingsSchema.safeParse({ options: [custom, { ...custom, id: "custom-other", label: "limited edition" }], assignments: {} }).success).toBe(false);
  });
});