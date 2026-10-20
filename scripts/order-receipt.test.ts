import { describe, it, expect } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { receiptFromOrder, canReadReceipt } from '../src/lib/order-receipt';
import { generateReceiptPdf } from '../src/lib/receipt-pdf.server';
import { alexPaid, alexPending, alexMultipage } from './receipt-fixtures';
import { cancelAndRefreshQuote, isVerifiedQuote } from '../src/lib/checkout-quote-refresh';
import { ownsRow } from '../src/lib/guest-capability';

describe('saved historical receipts', () => {
  it('reconciles all seven named positive discounts to saved $390 total', () => {
    const r = receiptFromOrder(alexPaid);
    expect(r.beforeCents).toBe(60000); expect(r.discounts).toHaveLength(7);
    expect(r.beforeCents - r.discounts.reduce((a, d) => a + d.cents, 0) + r.shippingCents).toBe(39000);
    expect(r.totalCents).toBe(39000); expect(r.builtInSavings).toBe(5000);
  });
  it('retains mixed saved sizes and kits and known original unit', () => {
    const r = receiptFromOrder(alexPaid); expect(r.lines.map(l => l.sizePack)).toEqual(['10mg · Single vial', '20mg · Single vial', '5mg · 10x Kit']);
    expect(r.lines[2]?.originalUnitCents).toBe(25000);
  });
  it('pending is $0 paid and $555 balance, never a paid receipt', () => {
    const r = receiptFromOrder(alexPending); expect(r.status).toBe('Payment pending'); expect(r.amountPaidCents).toBe(0); expect(r.balanceCents).toBe(55500);
  });
  it('refunded status takes priority and does not invent refund balance', () => {
    const r = receiptFromOrder({ ...alexPaid, refunded_at: '2026-10-20T09:00:00Z' }); expect(r.status).toBe('Refunded'); expect(r.balanceCents).toBeNull();
  });
  it('legacy $150 item / $112.50 final does not mislabel $112.50 as before discounts', () => {
    const r = receiptFromOrder({ ...alexPaid, pricing_snapshot: null, order_items: [{ product_name: 'Retatrutide', quantity: 1, unit_price: 150 }], total: 112.5 });
    expect(r.beforeCents).toBe(15000); expect(r.discounts).toEqual([{ label: 'Other saved discount — breakdown not recorded', cents: 3750 }]); expect(r.warnings.length).toBeGreaterThan(0);
  });
  it('overstated saved discount detail is not represented as verified', () => {
    const r = receiptFromOrder({ ...alexPaid, pricing_snapshot: { quote: { itemsCents: 60000, clubCents: 90000 } } });
    expect(r.discounts.some(d => d.label === 'Titan Club')).toBe(false); expect(r.discounts[0]?.cents).toBe(21000);
  });
  it('owner/admin access denies cross-member and ownerless reads', () => {
    expect(canReadReceipt('alex', 'alex', false)).toBe(true); expect(canReadReceipt('other', 'alex', false)).toBe(false);
    expect(canReadReceipt('other', 'alex', true)).toBe(true); expect(canReadReceipt('other', null, false)).toBe(false);
  });
  it('guest ownership is verified capability-only and denies member rows', () => {
    const guest = { kind: 'guest' as const, userId: null, guestSessionId: 'session-a' };
    expect(ownsRow(guest, { user_id: null, guest_session_id: 'session-a' })).toBe(true);
    expect(ownsRow(guest, { user_id: null, guest_session_id: 'session-b' })).toBe(false);
    expect(ownsRow(guest, { user_id: 'member', guest_session_id: 'session-a' })).toBe(false);
  });
  it('creates real PDF bytes, application/pdf MIME and stable filename with multiple pages', async () => {
    const logo = new Uint8Array(await readFile('public/favicon.png'));
    const pdf = await generateReceiptPdf(receiptFromOrder(alexMultipage), logo);
    expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe('%PDF-'); expect(pdf.mime).toBe('application/pdf');
    expect(pdf.filename).toBe('TL-900003-paid-receipt.pdf');
    const { PDFDocument } = await import('pdf-lib'); expect((await PDFDocument.load(pdf.bytes)).getPageCount()).toBeGreaterThan(1);
  });
});
describe('checkout cancellation and quote trust', () => {
  it('refreshes and clears only after confirmed terminal cancellation', async () => {
    const events: string[] = [];
    await cancelAndRefreshQuote({ cancel: async () => { events.push('cancelled'); return { ok: true }; }, clear: () => events.push('clear'), refresh: async () => events.push('refresh') });
    expect(events).toEqual(['cancelled', 'clear', 'refresh']);
  });
  it('failed cancellation never clears or refreshes to imply released offer', async () => {
    let cleared = false; let refreshed = false;
    await expect(cancelAndRefreshQuote({ cancel: async () => ({ ok: false }), clear: () => { cleared = true; }, refresh: async () => { refreshed = true; } })).rejects.toThrow('reserved');
    expect(cleared).toBe(false); expect(refreshed).toBe(false);
  });
  it('rejects stale, previous and failed quotes for payment amount display', () => {
    expect(isVerifiedQuote({ data: { totalCents: 10000 }, isFetching: false, isPlaceholderData: false, isError: false })).toBe(true);
    expect(isVerifiedQuote({ data: { totalCents: 9000 }, isFetching: true, isPlaceholderData: false, isError: false })).toBe(false);
    expect(isVerifiedQuote({ data: { totalCents: 9000 }, isFetching: false, isPlaceholderData: true, isError: false })).toBe(false);
    expect(isVerifiedQuote({ data: { totalCents: 9000 }, isFetching: false, isPlaceholderData: false, isError: true })).toBe(false);
  });
});