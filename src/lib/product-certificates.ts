import type { Product, ProductLink } from "./products";
import { canonicalUrl } from "./storefrontContent";

/** Shared boundary for Admin JSON, catalogue and document links. */
export function sanitizeProductLinks(raw: unknown): ProductLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 50).flatMap((l) => {
    if (!l || typeof l.url !== "string") return [];
    const url = canonicalUrl(l.url);
    if (!url) return [];
    const text = (v: unknown, n: number) => typeof v === "string" ? v.trim().slice(0,n) : "";
    return [{label:text(l.label,160),url,
      ...(l.kind === "coa" || l.kind === "document" ? {kind:l.kind} : {}),
      variantId:text(l.variantId,120),strength:text(l.strength,80),batch:text(l.batch,120)} as ProductLink];
  });
}
export function isCertificate(l: ProductLink) {
  if (l.kind) return l.kind === "coa";
  if (/\b(?:guide|manual|instructions|protocol)\b/i.test(l.label)) return false;
  // Existing Admin uploads use the certificates folder. Generic PDFs/manuals
  // elsewhere stay documents; an explicit document kind overrides legacy rules.
  return /(?:certificate|\bcoa\b)/i.test(l.label) || /(?:^|[\/%])certificates(?:[\/%]|$)/i.test(l.url)
    || /(?:^|[?&])path=certificates%2f/i.test(l.url);
}
export function productCertificates(p: Product) {
  return sanitizeProductLinks(p.links).filter(isCertificate);
}
export function certificateTitle(p: Product, l: ProductLink) {
  const variant = (p.variants ?? []).find(v => v.id === l.variantId);
  // A strength is inferred from a legacy label only when exactly one real
  // product variant has that number; no batch or test result is inferred.
  const numbers = l.label.match(/\d+(?:\.\d+)?/g);
  const candidates = numbers?.length === 1 ? (p.variants ?? []).filter(v => v.label.match(/\d+(?:\.\d+)?/)?.[0] === numbers[0]) : [];
  const strength = l.strength || variant?.label || (candidates.length === 1 ? candidates[0]!.label : "");
  const extra = strength || (!/^(?:certificate.*|coa)$/i.test(l.label) ? l.label : "");
  return [p.name, extra, l.batch ? `Batch ${l.batch}` : ""].filter(Boolean).join(" — ");
}
