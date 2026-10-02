import type { CartItem } from "@/lib/cart";
import {
  getProductOption,
  isComingSoon,
  stockState,
  variantStockFor,
  type Product,
} from "@/lib/products";

export function cartVariantQuantity(
  items: CartItem[],
  slug: string,
  variantId: string,
) {
  return items
    .filter(
      (item) =>
        item.slug === slug &&
        item.variantId === variantId &&
        item.pack !== "kit",
    )
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function equipmentUpsellState(
  product: Product,
  variantId: string,
  items: CartItem[],
) {
  const option = getProductOption(product, variantId, "single");
  const quantity = cartVariantQuantity(items, product.slug, variantId);
  const stock = variantStockFor(product, variantId);
  const unavailable = isComingSoon(product, variantId) || stockState(stock) === "out";
  const atMaximum = quantity >= 99 || (stock != null && quantity >= stock);

  return {
    option,
    quantity,
    stock,
    unavailable,
    atMaximum,
    canAdd: !unavailable && !atMaximum,
  };
}