/** One sale-price rule shared by the storefront and trusted checkout pricing. */
export function promotedPrice(price: number, sale?: number | null) {
  return typeof sale === "number" && Number.isFinite(sale) && sale > 0 && sale < price ? sale : price;
}
export function promotionKey(slug: string, variantId?: string) { return variantId ? `${slug}::${variantId}` : slug; }
