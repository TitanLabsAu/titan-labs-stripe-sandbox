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

export type SpendOrder = { status: string; stripe_livemode?: boolean | null; payment_confirmed: boolean | null; refunded_at?: string | null; total?: number | string | null };

/** Only successfully paid (never Stripe test-mode), non-cancelled, unrefunded orders count toward member spend and purchase counts. */
export function countsTowardSpend(o: SpendOrder) {
  return !!o.payment_confirmed && o.stripe_livemode !== false && o.status !== "cancelled" && o.status !== "pending_payment" && !o.refunded_at;
}

export function memberSpend(orders: SpendOrder[]) {
  const paid = orders.filter(countsTowardSpend);
  return { count: paid.length, cents: paid.reduce((s, o) => s + Math.round(Number(o.total ?? 0) * 100), 0) };
}

/** Archive ("delete payment") is a reversible hide for terminal unpaid or cancelled records only — never live paid history. */
export function canArchiveOrder(o: ManualPaymentOrder & { archived_at?: string | null }) {
  if (o.archived_at) return false;
  return o.status === "cancelled" || !o.payment_confirmed;
}
