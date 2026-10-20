import type { SavedReceiptOrder } from '../src/lib/order-receipt';
import { quoteOrder, type PricingSettings } from '../src/lib/order-pricing';
import type { Json } from '../src/integrations/supabase/types';

export const receiptExampleSettings: PricingSettings = {
  multibuyTiers: [{units: 2, percent: 10}, {units: 3, percent: 15}, {units: 4, percent: 20}],
  cryptoPercent: 10, combinedCapPercent: 20, allowMultibuyCrypto: true,
  allowCodeMultibuy: false, allowCodeCrypto: false, allowCreditCode: true, allowCreditDiscounts: true,
  creditUnitCents: 1000, maxCreditUnits: 2, referralRewardUnits: 1, rewardPercent: 10,
  rewardEvery: 5, rewardExpiryDays: 90, programEnabled: true,
  firstOffer: {enabled: true, percent: 10, combineMultibuy: false, combineCrypto: false, combineCode: false, combineCredit: false},
};
export const paidQuote = quoteOrder({lines: [
  {unitCents:15000,baseCents:15000,quantity:1}, {unitCents:25000,baseCents:25000,quantity:1},
  // Fictional saved kit is $200 versus ten $25 singles: known reference, not live catalogue pricing.
  {unitCents:20000,baseCents:25000,quantity:1}], shippingMethod:'standard',paymentMethod:'payid'},receiptExampleSettings);
export const pendingQuote = quoteOrder({lines:[{unitCents:15000,baseCents:15000,quantity:1}],
  shippingMethod:'standard',paymentMethod:'payid',firstOfferEligible:true},receiptExampleSettings);
const snapshot = (quote: typeof paidQuote): Json => JSON.parse(JSON.stringify({quote,settings:receiptExampleSettings}));

/** Fictional examples only. Never insert these into the database. */
export const alexPaid: SavedReceiptOrder = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', order_number: 900001,
  created_at: '2026-10-20T08:00:00Z', status: 'processing', payment_confirmed: true,
  payment_confirmed_at: '2026-10-20T08:05:00Z', payment_method: 'payid',
  contact_name: 'Alex Example (fictional)', contact_email: 'alex@example.invalid', contact_phone: '',
  shipping_address: 'Example address — fictional review only', subtotal: paidQuote.merchandiseCents / 100, shipping: paidQuote.shippingCents / 100, total: paidQuote.totalCents / 100,
  order_items: [
    { product_name: 'Retatrutide', variant_label: '10mg · Single vial', variant_id: 'size-10', quantity: 1, unit_price: 150 },
    { product_name: 'Retatrutide', variant_label: '20mg · Single vial', variant_id: 'size-20', quantity: 1, unit_price: 250 },
    { product_name: 'BPC-157', variant_label: '5mg · 10x Kit', variant_id: 'size-5', quantity: 1, unit_price: 200, original_unit_cents: 25000 },
  ],
  pricing_snapshot: snapshot(paidQuote),
};
export const alexPending: SavedReceiptOrder = { ...alexPaid, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', order_number: 900002,
  payment_confirmed: false, payment_confirmed_at: null, subtotal: pendingQuote.merchandiseCents / 100, shipping: pendingQuote.shippingCents / 100, total: pendingQuote.totalCents / 100,
  order_items: [alexPaid.order_items[0]].filter((i): i is NonNullable<typeof i> => Boolean(i)),
  pricing_snapshot: snapshot(pendingQuote),
};
export const alexMultipage: SavedReceiptOrder = { ...alexPaid, order_number: 900003, subtotal: 630, total: 630,
  order_items: Array.from({ length: 21 }, (_, i) => ({ product_name: `Fictional research sample ${i + 1} with a deliberately long saved product name for wrapping verification`, variant_label: `${i % 2 ? '20mg · Single vial' : '10mg · 10x Kit'} — historical size and pack`, quantity: 1, unit_price: 30 })),
  pricing_snapshot: { quote: { itemsCents: 63000 } },
};