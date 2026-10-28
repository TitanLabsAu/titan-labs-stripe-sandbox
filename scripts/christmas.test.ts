import { describe, expect, test } from "vitest";
import {
  CHRISTMAS_DEFAULTS,
  allowsChristmas,
  allowsChristmasMotion,
  assertChristmasBase,
  parseChristmas,
  randomDelay,
  validateChristmas,
} from "../src/lib/christmas";

describe("Titan Gold Christmas configuration", () => {
  test("a fresh or malformed deployment is off without any database write", () => {
    for (const raw of [
      undefined,
      null,
      "",
      "not json",
      "[]",
      '{"enabled":"true"}',
      '{"enabled":true,"intervalMin":9000}',
      '{"enabled":true,"unknown":"x"}',
    ]) {
      expect(parseChristmas(raw).enabled).toBe(false);
    }
    expect(parseChristmas("{}")).toEqual(CHRISTMAS_DEFAULTS);
  });
  test("saved settings round trip while remaining independent of device theme and pricing", () => {
    const configured = validateChristmas({
      ...CHRISTMAS_DEFAULTS,
      enabled: true,
      intervalMin: 70,
      intervalMax: 170,
      snowAmount: "medium",
      flightSeconds: 12,
    });
    expect(parseChristmas(JSON.stringify(configured))).toEqual(configured);
    expect(validateChristmas({ enabled: true })).toEqual({
      ...CHRISTMAS_DEFAULTS,
      enabled: true,
    });
    expect(() => validateChristmas({ ...configured, theme: "dark" })).toThrow();
    expect(() => validateChristmas({ ...configured, discount: 20 })).toThrow();
    expect(
      parseChristmas(JSON.stringify({ ...configured, enabled: false })).enabled,
    ).toBe(false);
  });
  test("rejects unsafe timers and reversed random ranges", () => {
    for (const values of [
      { firstDelayMin: 0 },
      { intervalMin: 9 },
      { intervalMax: 7201 },
      { flightSeconds: 3 },
      { flightSeconds: 21 },
      { flightSeconds: NaN },
      { flightSeconds: Infinity },
      { intervalMin: 20.5 },
      { firstDelayMin: 100, firstDelayMax: 30 },
      { intervalMin: 300, intervalMax: 100 },
    ]) {
      expect(() =>
        validateChristmas({ ...CHRISTMAS_DEFAULTS, ...values }),
      ).toThrow();
    }
  });
  test("random times use requested inclusive bounds and fixed times also work", () => {
    expect(randomDelay(30, 60, () => 0)).toBe(30000);
    expect(randomDelay(30, 60, () => 1)).toBe(60000);
    expect(randomDelay(30, 60, () => 0.5)).toBe(45000);
    expect(randomDelay(45, 45, () => 0.72)).toBe(45000);
    expect(randomDelay(30, 60, () => -1)).toBe(30000);
    expect(randomDelay(30, 60, () => 2)).toBe(60000);
  });
  test("checkout, payment, authentication and admin routes never get decorations", () => {
    for (const route of [
      "/admin",
      "/admin/",
      "/admin/orders",
      "/auth",
      "/auth/reset-password",
      "/checkout",
      "/checkout/complete",
      "/receipt/abc",
      "/payment",
      "/api/public/product-image",
      "/research-preview/test",
      "/lovable/email/transactional/preview",
    ])
      expect(allowsChristmas(route)).toBe(false);
    for (const route of [
      "/",
      "/account",
      "/calendar",
      "/orders",
      "/order-history",
      "/calculator",
      "/range",
      "/pens",
      "/product/titan-v2-reusable-pen",
      "/research",
      "/research/abc",
      "/pen-guide",
      "/contact",
      "/reviews",
    ])
      expect(allowsChristmas(route)).toBe(true);
  });
  test("member tabs receive static decor but never Santa motion", () => {
    for(const path of ["/account", "/calendar", "/orders", "/order-history", "/account/", "/CALENDAR"]) {
      expect(allowsChristmas(path)).toBe(true);
      expect(allowsChristmasMotion(path)).toBe(false);
    }
    for(const path of ["/", "/range", "/calculator"])expect(allowsChristmasMotion(path)).toBe(true);
    for(const path of ["/auth", "/checkout", "/admin", "/payment", "/account/security"]){expect(allowsChristmas(path)).toBe(false);expect(allowsChristmasMotion(path)).toBe(false);}
  });
  test("stale Admin sessions cannot overwrite another seasonal save", () => {
    expect(() => assertChristmasBase(undefined, undefined)).not.toThrow();
    expect(() => assertChristmasBase("saved", "saved")).not.toThrow();
    expect(() => assertChristmasBase("new", "old")).toThrow(/changed/);
    expect(() => assertChristmasBase("new", undefined)).toThrow(/changed/);
    expect(() => assertChristmasBase(undefined, "old")).toThrow(/changed/);
  });
});

import { readFileSync } from "node:fs";
import { imageSize } from "image-size";

describe("realistic Santa sprite", () => {
  test("ships the transparent WebP sheet at the exact CSS frame geometry", () => {
    const bytes = readFileSync(
      "public/christmas/santa-sleigh-realistic-v1.webp",
    );
    const size = imageSize(bytes);
    expect(size.width).toBe(1280);
    expect(size.height).toBe(640);
    expect(size.type).toBe("webp");
    expect(bytes.length).toBeLessThan(350000);
    expect(bytes.includes(Buffer.from("ALPH"))).toBe(true);
    const css = readFileSync("src/components/christmas/christmas.css", "utf8");
    expect(css).toContain('url("/christmas/santa-sleigh-realistic-v1.webp")');
    expect(css).toContain("background-size: 200% 200%");
    expect(css).toContain("steps(1, end)");
  });
});
