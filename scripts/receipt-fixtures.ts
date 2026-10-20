import type { SavedReceiptOrder } from '../src/lib/order-receipt';

/** Fictional examples only. Never insert these into the database. */
export const alexPaid: SavedReceiptOrder = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', order_number: 900001,
  created_at: '2026-10-20T08:00:00Z', status: 'processing', payment_confirmed: true,
  payment_confirmed_at: '2026-10-20T08:05:00Z', payment_method: 'payid',
  contact_name: 'Alex Example (fictional)', contact_email: 'alex@example.invalid', contact_phone: '',
  shipping_address: 'Example address — fictional review only', subtotal: 390, shipping: 0, total: 390,
  order_items: [
    { product_name: 'Retatrutide', variant_label: '10mg · Single vial', variant_id: 'size-10', quantity: 1, unit_price: 150 },
    { product_name: 'Retatrutide', variant_label: '20mg · Single vial', variant_id: 'size-20', quantity: 1, unit_price: 250 },
    { product_name: 'BPC-157', variant_label: '5mg · 10x Kit', variant_id: 'size-5', quantity: 1, unit_price: 200, original_unit_cents: 25000 },
  ],
  pricing_snapshot: { quote: { itemsCents: 60000, baseCents: 65000, kitSavingsCents: 5000,
    multibuyCents: 3000, cryptoCents: 2000, firstOfferCents: 4000, foundationCents: 2000,
    clubCents: 6000, codeCents: 2000, code: 'ALEX-DEMO', creditCents: 2000,
    clubFreeShipping: true, clubFreeShippingCents: 1500, capApplied: true } },
};
export const alexPending: SavedReceiptOrder = { ...alexPaid, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', order_number: 900002,
  payment_confirmed: false, payment_confirmed_at: null, subtotal: 540, shipping: 15, total: 555,
  pricing_snapshot: { quote: { itemsCents: 60000, baseCents: 65000, kitSavingsCents: 5000, firstOfferCents: 6000 } },
};
export const alexMultipage: SavedReceiptOrder = { ...alexPaid, order_number: 900003, subtotal: 630, total: 630,
  order_items: Array.from({ length: 21 }, (_, i) => ({ product_name: `Fictional research sample ${i + 1} with a deliberately long saved product name for wrapping verification`, variant_label: `${i % 2 ? '20mg · Single vial' : '10mg · 10x Kit'} — historical size and pack`, quantity: 1, unit_price: 30 })),
  pricing_snapshot: { quote: { itemsCents: 63000 } },
};