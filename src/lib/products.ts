import klow80 from "@/assets/klow80.asset.json";
import wolverine from "@/assets/wolverine.asset.json";
import nad1000 from "@/assets/nad1000.asset.json";

export type ProductLink = { label: string; url: string };
export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  kitPrice?: number | null;
  /** Units on hand for this vial size. null = not tracked. */
  stock?: number | null;
  reconVialMg?: number | null;
  reconWaterMl?: number | null;
  reconDoseMg?: number | null;
  reconNotes?: string;
};
export type ProductPack = "single" | "kit";

export type Product = {
  slug: string;
  name: string;
  /** Price the customer pays (already the sale price when one is set). */
  price: number;
  /** Original price, present only when the product is on sale. */
  wasPrice?: number | null;
  promoLabel?: string;
  kitPrice?: number | null;
  variants?: ProductVariant[];
  image: string;
  alt: string;
  blurb: string;
  description?: string;
  details: string[];
  categories?: string[];
  protocol?: string;
  reconVialMg?: number | null;
  reconWaterMl?: number | null;
  reconDoseMg?: number | null;
  reconNotes?: string;
  links?: ProductLink[];
  /** Units on hand. null = not tracked. */
  stock?: number | null;
};

export const LOW_STOCK_THRESHOLD = 7;

/** "out" = nothing left, "low" = under the low-stock threshold, "ok" = plenty (or untracked). */
export function stockState(stock?: number | null): "out" | "low" | "ok" {
  if (stock === null || stock === undefined) return "ok";
  if (stock <= 0) return "out";
  if (stock < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

/** Units on hand for a given vial size, falling back to the product-wide count. */
export function variantStockFor(product: Product, variantId?: string | null) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return product.stock ?? null;
  const variant = variants.find((v) => v.id === variantId) ?? null;
  if (!variant) return product.stock ?? null;
  return variant.stock ?? null;
}

/** Units on hand across every vial size (or the product-wide count when no sizes exist). */
export function totalStockFor(product: Product) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return product.stock ?? null;
  return variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock ?? 0)), 0);
}

export const products: Product[] = [
  {
    slug: "klow-80mg",
    name: "KLOW 80mg",
    price: 140,
    image: klow80.url,
    alt: "KLOW 80mg vials by Titan Labs",
    blurb:
      "A premium blended 80mg vial, batch tested for purity and shipped discreetly across Australia.",
    details: ["80mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
  {
    slug: "nad-1000mg",
    name: "NAD+ 1000mg",
    price: 120,
    image: nad1000.url,
    alt: "NAD+ 1000mg vials by Titan Labs",
    blurb: "High strength 1000mg NAD+ for wellness research protocols.",
    details: ["1000mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
  {
    slug: "wolverine-20mg",
    name: "Wolverine 20mg",
    price: 120,
    image: wolverine.url,
    alt: "Wolverine 20mg vials by Titan Labs",
    blurb: "Our recovery favourite. 20mg per vial, pure form, research use only.",
    details: ["20mg per vial", "Lab tested for purity", "Express, insured shipping"],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

export function kitPriceFor(singlePrice: number, explicitKitPrice?: number | null) {
  if (explicitKitPrice != null && explicitKitPrice > 0) return explicitKitPrice;
  return singlePrice * 10 * 0.8;
}

export function cartLineKey(slug: string, variantId?: string | null, pack: ProductPack = "single") {
  return [slug, variantId || "base", pack].join("::");
}

export function getProductOption(
  product: Product,
  variantId?: string | null,
  pack: ProductPack = "single",
) {
  const variant = (product.variants ?? []).find((v) => v.id === variantId) ?? null;
  const singlePrice = variant ? variant.price : product.price;
  const unitPrice = pack === "kit" ? kitPriceFor(singlePrice, variant?.kitPrice ?? product.kitPrice) : singlePrice;
  const variantLabel = variant?.label ?? "Single vial";
  return {
    key: cartLineKey(product.slug, variant?.id ?? null, pack),
    variantId: variant?.id ?? null,
    variantLabel,
    pack,
    unitPrice,
    stock: variant ? (variant.stock ?? null) : (product.stock ?? null),
    label: pack === "kit" ? `${variantLabel} · 10x Kit` : variantLabel,
  };
}

export function sortedProductVariants(product: Product) {
  const size = (label: string) => Number.parseFloat(label.replace(/[^0-9.]/g, ""));
  return [...(product.variants ?? [])].sort((a, b) => {
    const aSize = size(a.label);
    const bSize = size(b.label);
    if (Number.isFinite(aSize) && Number.isFinite(bSize) && aSize !== bSize) return aSize - bSize;
    return a.price - b.price || a.label.localeCompare(b.label);
  });
}

export function productBasePrice(product: Product) {
  const variantPrices = (product.variants ?? []).map((v) => v.price).filter((price) => price > 0);
  return variantPrices.length > 0 ? Math.min(...variantPrices) : product.price;
}

export function hasVariantPricing(product: Product) {
  return (product.variants ?? []).length > 0;
}

/** Reconstitution numbers for the selected vial size, falling back to the product defaults. */
export function getReconFor(product: Product, variantId?: string | null) {
  const variant = (product.variants ?? []).find((v) => v.id === variantId) ?? null;
  const pick = (a: number | null | undefined, b: number | null | undefined) =>
    a != null && !Number.isNaN(Number(a)) ? Number(a) : b != null ? Number(b) : null;
  return {
    vialMg: pick(variant?.reconVialMg, product.reconVialMg),
    waterMl: pick(variant?.reconWaterMl, product.reconWaterMl),
    doseMg: pick(variant?.reconDoseMg, product.reconDoseMg),
    notes: (variant?.reconNotes || product.reconNotes || "").trim(),
  };
}
