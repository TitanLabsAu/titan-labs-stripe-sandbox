import { z } from "zod";

export const PROMOTION_BANNERS_KEY = "promotion_banners";
export type BannerOption = { id: string; label: string; background: string; text: string; removed?: boolean | undefined };
export type BannerSettings = { options: BannerOption[]; assignments: Record<string, string> };
export const DEFAULT_BANNERS: BannerOption[] = [
  { id: "hot", label: "HOT PRODUCT", background: "#E9C365", text: "#031321" },
  { id: "flash", label: "FLASH SALE", background: "#BE123C", text: "#FFFFFF" },
  { id: "new", label: "NEW PRODUCT", background: "#006DA8", text: "#FFFFFF" },
];

export function contrastRatio(background: string, text: string) {
  const luminance = (hex: string) => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return (c[0] ?? 0) * .2126 + (c[1] ?? 0) * .7152 + (c[2] ?? 0) * .0722;
  };
  const a = luminance(background), b = luminance(text);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
const color = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex colour").transform(s => s.toUpperCase());
const optionSchema = z.object({
  id: z.string().regex(/^custom-[a-z0-9-]{1,64}$/, "Invalid banner ID"),
  label: z.string().trim().min(1).max(24).regex(/^[\p{L}\p{N} &+%!.\-]+$/u, "Use a plain banner label"),
  background: color, text: color, removed: z.boolean().optional(),
}).strict().refine(o => contrastRatio(o.background, o.text) >= 4.5, "Text contrast must be at least 4.5:1");
export const bannerSettingsSchema = z.object({
  options: z.array(optionSchema).max(30),
  assignments: z.record(z.string().regex(/^[a-z0-9-]+(?:::[a-zA-Z0-9_-]+)?$/).max(160), z.string().max(80)).refine(a => Object.keys(a).length <= 500, "Too many banner assignments"),
}).strict().superRefine((s, ctx) => {
  const ids = new Set(DEFAULT_BANNERS.map(o => o.id));
  const labels = new Set(DEFAULT_BANNERS.map(o => o.label));
  for (const o of s.options) {
    if (ids.has(o.id) || labels.has(o.label.toUpperCase())) ctx.addIssue({ code: "custom", message: "Banner IDs and labels must be unique" });
    ids.add(o.id); labels.add(o.label.toUpperCase());
  }
  for (const id of Object.values(s.assignments)) if (!ids.has(id)) ctx.addIssue({ code: "custom", message: "Unknown promotion banner" });
});
export function serialiseBannerSettings(settings: unknown) { return JSON.stringify(bannerSettingsSchema.parse(settings)); }
export function parseBannerSettings(raw?: string): BannerSettings {
  try { return bannerSettingsSchema.parse(JSON.parse(raw ?? "")); } catch { return { options: [], assignments: {} }; }
}
export function bannerOptions(s: BannerSettings) { return [...DEFAULT_BANNERS, ...s.options.filter(o => !o.removed)]; }

/** Exact size overrides never leak to sibling variants. Missing/retired choices use original status. */
export function resolveBanner(s: BannerSettings, key: string, label?: string, sale = false, hot = false): BannerOption | null {
  const selected = bannerOptions(s).find(o => o.id === s.assignments[key]);
  if (selected) return selected;
  const original = label?.trim() ?? "";
  const id = /^flash\s*sale$/i.test(original) ? "flash" : /^new\s*products?$/i.test(original) ? "new" : sale ? "flash" : /^hot\s*products?$/i.test(original) || hot ? "hot" : null;
  if (id) return DEFAULT_BANNERS.find(o => o.id === id) ?? null;
  // Preserve non-default legacy labels instead of replacing them with HOT PRODUCT.
  const base = DEFAULT_BANNERS[0];
  if (original && base) return { ...base, id: "legacy", label: original };
  return null;
}