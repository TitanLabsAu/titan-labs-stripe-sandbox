export const CATEGORIES = [
  "Recovery",
  "Metabolic",
  "Regenerative",
  "Cognitive",
  "Longevity",
  "Performance",
  "Dermal",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FREE_SHIPPING_THRESHOLD = 200;
export const EXPRESS_SHIPPING = 20;

export function shippingFor(subtotal: number) {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : EXPRESS_SHIPPING;
}
