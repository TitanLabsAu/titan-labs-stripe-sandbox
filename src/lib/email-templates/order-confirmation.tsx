import * as React from "react";
import type { TemplateEntry } from "./registry";
import { BrandedOrderEmail, type OrderEmailProps } from "./order-receipt-content";
import { LegacyOrderConfirmation } from './legacy-order-confirmation';

export type OrderConfirmationProps = OrderEmailProps;
export function OrderConfirmation(props: OrderConfirmationProps) {
  return props.receipt ? <BrandedOrderEmail {...props}/> : <LegacyOrderConfirmation {...props}/>;
}

export const template = {
  component: OrderConfirmation,
  subject: (data: Record<string, unknown>) =>
    `Your Titan Labs order ${data["orderNumber"] ?? ""}`,
  displayName: "Order confirmation (customer)",
  previewData: {
    orderNumber: "TL-1052",
    customerName: "Jane",
    total: "$300.00",
    items: ["2 × Retatrutide 10mg", "1 × BPC-157"],
  },
} satisfies TemplateEntry;
