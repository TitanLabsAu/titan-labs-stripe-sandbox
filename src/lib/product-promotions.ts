import type { Product } from "./products";
import { promotionKey } from "./variant-promotions";
export function hotVariantIds(product: Product, selections: string[] = []) {
  const variants = product.variants ?? [];
  const explicit = variants.some(v => typeof v.hotProduct === "boolean");
  const legacy = !explicit && (selections.includes(product.slug) || /^hot\s*products?$/i.test(product.promoLabel?.trim() ?? ""));
  return variants.filter(v => v.hotProduct || (v.hotProduct !== false && selections.includes(promotionKey(product.slug, v.id))) || legacy).map(v => v.id);
}
export function withHotSelections(product: Product, selections: string[]) {
  const ids = hotVariantIds(product, selections);
  return { ...product, variants: (product.variants ?? []).map(v => ({ ...v, hotProduct: ids.includes(v.id) })) };
}
export function hotProductSelections(products: Product[], selections: string[] = []) {
  const keys = [...new Set([...selections, ...products.flatMap(p => (p.variants ?? []).length
    ? hotVariantIds(p, selections).map(id => promotionKey(p.slug, id))
    : /^hot\s*products?$/i.test(p.promoLabel?.trim() ?? "") ? [p.slug] : [])])];
  const seen = new Set<string>();
  return keys.flatMap(key => {
    const [slug, id] = key.split("::"); const p = products.find(p => p.slug === slug);
    if (!p) return [];
    if (!(p.variants ?? []).length) { if (id) return []; if (seen.has(p.slug)) return []; seen.add(p.slug); return [p]; }
    const ids = id ? hotVariantIds(p, selections).filter(v => v === id) : hotVariantIds(p, selections);
    return ids.flatMap(id => {
      const key = promotionKey(p.slug, id); if (seen.has(key)) return []; seen.add(key);
      const v = p.variants!.find(v => v.id === id)!;
      return [{ ...p, variants: [{ ...v, hotProduct: true }], promoLabel: v.promoLabel || "Hot product" }];
    });
  });
}
