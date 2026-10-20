import type { Json } from '@/integrations/supabase/types';

/** Historical display model: saved values only. Never import catalogue/pricing evaluators. */
export type SavedReceiptItem = { id?: string; product_name: string; product_slug?: string; variant_label?: string | null; variant_id?: string | null; quantity: number; unit_price: number; original_unit_cents?: number | null };
export type SavedReceiptOrder = {
  id: string; order_number?: number | null; created_at: string; status: string;
  subtotal: number; shipping: number; total: number; order_items: SavedReceiptItem[];
  payment_confirmed?: boolean | null; payment_confirmed_at?: string | null; refunded_at?: string | null;
  payment_method?: string | null; pricing_snapshot?: Json; discount_code?: string | null;
  contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null; shipping_address?: string | null;
};
export type Receipt = ReturnType<typeof receiptFromOrder>;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const integer = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const cents = (value: number) => Math.round(Number(value) * 100);
export const receiptMoney = (value: number) => `$${(value / 100).toFixed(2)} AUD`;
export const receiptDate = (value: string) => new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Melbourne' }).format(new Date(value));

export function receiptFromOrder(order: SavedReceiptOrder) {
  const snapshot = record(order.pricing_snapshot);
  const q = record(snapshot['quote']);
  const lines = order.order_items.map(item => ({
    name: item.product_name, sizePack: item.variant_label?.trim() || 'Size / pack not recorded', variantId: item.variant_id ?? null,
    quantity: item.quantity, unitCents: cents(item.unit_price), lineCents: cents(item.unit_price) * item.quantity,
    originalUnitCents: integer(item.original_unit_cents),
  }));
  const lineTotal = lines.reduce((sum, line) => sum + line.lineCents, 0);
  const totalCents = cents(order.total), shippingCents = cents(order.shipping);
  const merchandiseCents = totalCents - shippingCents;
  const beforeCents = integer(q['itemsCents']) ?? lineTotal;
  const warnings: string[] = [];
  const candidates: [string, string][] = [
    ['multibuyCents', 'Titan Stack / multibuy'], ['cryptoCents', 'Cryptocurrency discount'],
    ['firstOfferCents', 'First-purchase offer'], ['foundationCents', 'Foundation Member'],
    ['clubCents', 'Titan Club'], ['codeCents', `Discount code${typeof q['code'] === 'string' ? ` · ${q['code']}` : order.discount_code ? ` · ${order.discount_code}` : ''}`],
    ['creditCents', 'Referral reward / credit'],
  ];
  let discounts = candidates.flatMap(([key, label]) => { const amount = integer(q[key]); return amount && amount > 0 ? [{ label, cents: amount }] : []; });
  const expectedDiscount = beforeCents - merchandiseCents;
  if (expectedDiscount < 0 || discounts.reduce((sum, d) => sum + d.cents, 0) > expectedDiscount) {
    warnings.push('Saved discount detail does not reconcile; individual amounts cannot be verified.');
    discounts = [];
  }
  const unexplained = expectedDiscount - discounts.reduce((sum, d) => sum + d.cents, 0);
  if (unexplained > 0) discounts.push({ label: 'Other saved discount — breakdown not recorded', cents: unexplained });
  if (!Object.keys(q).length) warnings.push('Historical pricing breakdown unavailable; saved item prices and final total shown.');
  if (lineTotal !== beforeCents) warnings.push('Saved item totals differ from the saved merchandise subtotal.');
  const status = order.refunded_at ? 'Refunded' : order.payment_confirmed === true ? 'Paid' : order.status === 'cancelled' ? 'Cancelled — payment not confirmed' : order.payment_confirmed === false ? 'Payment pending' : 'Payment status not recorded';
  const payment = ({ card: 'Card / Stripe', payid: 'PayID / bank transfer', wise: 'Wise', crypto: 'Cryptocurrency' } as Record<string, string>)[order.payment_method ?? ''] ?? 'Payment method not recorded';
  const builtInSavings = integer(q['kitSavingsCents']) ?? 0;
  return {
    id: order.id, reference: order.order_number ? `TL-${order.order_number}` : `TL-${order.id.slice(0, 8).toUpperCase()}`,
    date: order.created_at, status, title: order.refunded_at ? 'Refunded order receipt' : order.payment_confirmed === true ? 'Paid receipt' : 'Order summary',
    lines, beforeCents, discounts, merchandiseCents, shippingCents, totalCents,
    reconciliationCents: expectedDiscount < 0 ? merchandiseCents - beforeCents : 0,
    builtInSavings, originalTotalCents: integer(q['baseCents']),
    shippingLabel: shippingCents > 0 ? 'Shipping' : q['clubFreeShipping'] === true && Number(q['clubFreeShippingCents']) > 0 ? 'Free shipping — Titan Club' : integer(q['freeShippingCents']) && Number(q['freeShippingCents']) > 0 ? 'Free shipping — order qualification' : 'Shipping — no charge recorded',
    payment, paidAt: order.payment_confirmed_at ?? null,
    amountPaidCents: order.payment_confirmed === true ? totalCents : order.payment_confirmed === false && !order.refunded_at ? 0 : null,
    balanceCents: order.refunded_at ? null : order.payment_confirmed === true ? 0 : order.payment_confirmed === false ? totalCents : null,
    capNote: q['capApplied'] === true || q['clubCapReached'] === true || q['foundationCapReached'] === true ? 'Saved discount cap applied; displayed savings already reflect this limit.' : null,
    warnings, customer: { name: order.contact_name ?? '', email: order.contact_email ?? '', phone: order.contact_phone ?? '', address: order.shipping_address ?? '' },
  };
}

/** Cross-member protection is explicit in addition to the database read policy. */
export function canReadReceipt(userId: string, ownerId: string | null, isAdmin: boolean) {
  return isAdmin || Boolean(ownerId && userId === ownerId);
}

export const RECEIPT_ORDER_COLUMNS = 'id, user_id, order_number, created_at, status, subtotal, shipping, total, payment_confirmed, payment_confirmed_at, refunded_at, payment_method, pricing_snapshot, discount_code, contact_name, contact_email, contact_phone, shipping_address, order_items(id, product_name, product_slug, variant_label, variant_id, quantity, unit_price)';

/** Explicit response allowlist: never return raw snapshots, ownership IDs or internal fields. */
export function ownerVisibleReceiptOrder(row: SavedReceiptOrder): SavedReceiptOrder {
  const snapshot = record(row.pricing_snapshot), quote = record(snapshot['quote']);
  const safeQuote: Record<string, Json> = {};
  for (const key of ['itemsCents', 'baseCents', 'kitSavingsCents', 'multibuyCents', 'cryptoCents', 'firstOfferCents', 'foundationCents', 'clubCents', 'codeCents', 'code', 'creditCents', 'clubFreeShipping', 'clubFreeShippingCents', 'freeShippingCents', 'capApplied', 'clubCapReached', 'foundationCapReached']) {
    const value = quote[key];
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' || value === null) safeQuote[key] = value;
  }
  return {
    id: row.id, order_number: row.order_number ?? null, created_at: row.created_at, status: row.status,
    subtotal: row.subtotal, shipping: row.shipping, total: row.total,
    payment_confirmed: row.payment_confirmed ?? null, payment_confirmed_at: row.payment_confirmed_at ?? null,
    refunded_at: row.refunded_at ?? null, payment_method: row.payment_method ?? null,
    discount_code: row.discount_code ?? null, pricing_snapshot: { quote: safeQuote },
    contact_name: row.contact_name ?? null, contact_email: row.contact_email ?? null,
    contact_phone: row.contact_phone ?? null, shipping_address: row.shipping_address ?? null,
    order_items: row.order_items.map(i => ({ product_name: i.product_name, variant_label: i.variant_label ?? null,
      variant_id: i.variant_id ?? null, quantity: i.quantity, unit_price: i.unit_price })),
  };
}