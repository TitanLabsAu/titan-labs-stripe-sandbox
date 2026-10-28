import { z } from "zod";

export const CHRISTMAS_KEY = "christmas_theme";
export const CHRISTMAS_DEFAULTS = {
  enabled: false,
  density: "subtle" as const,
  lights: true,
  greenery: true,
  wreaths: true,
  hats: true,
  santaEnabled: true,
  firstDelayMin: 30,
  firstDelayMax: 60,
  intervalMin: 120,
  intervalMax: 240,
  flightSeconds: 8,
  snowEnabled: true,
  snowAmount: "light" as const,
};
const seconds = (min: number, max: number, fallback: number) =>
  z.number().finite().int().min(min).max(max).default(fallback);
export const christmasSchema = z
  .object({
    enabled: z.boolean().default(false),
    density: z.enum(["subtle", "full"]).default("subtle"),
    lights: z.boolean().default(true),
    greenery: z.boolean().default(true),
    wreaths: z.boolean().default(true),
    hats: z.boolean().default(true),
    santaEnabled: z.boolean().default(true),
    firstDelayMin: seconds(1, 3600, 30),
    firstDelayMax: seconds(1, 3600, 60),
    intervalMin: seconds(10, 7200, 120),
    intervalMax: seconds(10, 7200, 240),
    flightSeconds: seconds(4, 20, 8),
    snowEnabled: z.boolean().default(true),
    snowAmount: z.enum(["light", "medium", "heavy"]).default("light"),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const [min, max] of [
      ["firstDelayMin", "firstDelayMax"],
      ["intervalMin", "intervalMax"],
    ] as const) {
      if (value[min] > value[max])
        ctx.addIssue({
          code: "custom",
          path: [max],
          message: "Maximum must be at least the minimum.",
        });
    }
  });
export type ChristmasSettings = z.infer<typeof christmasSchema>;
export function validateChristmas(value: unknown): ChristmasSettings {
  return christmasSchema.parse(value);
}
/** Missing or corrupt settings always leave the seasonal layer OFF. */
export function parseChristmas(
  raw: string | undefined | null,
): ChristmasSettings {
  try {
    return validateChristmas(JSON.parse(raw ?? "{}"));
  } catch {
    return { ...CHRISTMAS_DEFAULTS };
  }
}
export function randomDelay(
  min: number,
  max: number,
  random = Math.random,
): number {
  const unit = Math.max(0, Math.min(1, random()));
  return (min + (max - min) * unit) * 1000;
}
/** Seasonal graphics never appear in account, payment, authentication or Admin flows. */
export function allowsChristmas(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return !/^\/(admin|auth|account|calendar|order-history|orders|checkout|receipt|payment|research-preview|api|lovable)(\/|\.|$)/.test(
    path,
  );
}
export function assertChristmasBase(
  current: string | undefined,
  expected: string | undefined,
): void {
  if (current !== expected)
    throw new Error(
      "Christmas settings changed while you were editing. Reload before saving.",
    );
}
