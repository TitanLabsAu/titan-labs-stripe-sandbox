/** Manual (PayID / crypto) payments are the only ones an admin may mark paid; legacy null methods were PayID. */
export type ManualPaymentOrder = {
  status: string;
  payment_method: string | null;
  payment_confirmed: boolean | null;
  refunded_at?: string | null;
};

export function isManualPaymentMethod(method: string | null) {
  return method === null || method === "payid" || method === "crypto";
}

export function canMarkManualPaid(order: ManualPaymentOrder) {
  return (
    !order.payment_confirmed &&
    !order.refunded_at &&
    order.status !== "cancelled" &&
    isManualPaymentMethod(order.payment_method)
  );
}
