/** Customer-facing order reference. Uses orders.order_number as the source of truth. */
export function orderReference(order: {
  id: string;
  order_number?: number | string | null;
}): string {
  const num = order.order_number;
  if (num !== null && num !== undefined && `${num}`.trim() !== "") {
    return `TL-${num}`;
  }
  return order.id.slice(0, 8).toUpperCase();
}
