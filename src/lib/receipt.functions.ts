import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { canReadReceipt, receiptFromOrder, RECEIPT_ORDER_COLUMNS, type SavedReceiptOrder } from './order-receipt';

export const getOrderReceipt = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; pdf?: boolean }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orderId)) throw new Error('Order not found');
    return { orderId: input.orderId, pdf: input.pdf === true };
  })
  .handler(async ({ data, context }) => {
    // Ordinary reads use the user's client/RLS, including the existing admin read policy.
    const { data: order, error } = await context.supabase.from('orders').select(RECEIPT_ORDER_COLUMNS).eq('id', data.orderId).maybeSingle();
    if (error || !order) throw new Error('Order not found or access denied');
    const row = order as unknown as SavedReceiptOrder & { user_id: string | null };
    let admin = false;
    if (row.user_id !== context.userId) {
      const result = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
      admin = !result.error && result.data === true;
    }
    if (!canReadReceipt(context.userId, row.user_id, admin)) throw new Error('Order not found or access denied');
    if (!row.order_items.length) throw new Error('Order items are not complete yet');
    const receipt = receiptFromOrder(row);
    if (!data.pdf) return { order: row, pdf: null };
    const { generateBrandedReceiptPdf } = await import('./receipt-pdf.server');
    const pdf = await generateBrandedReceiptPdf(receipt);
    let binary = ''; for (const byte of pdf.bytes) binary += String.fromCharCode(byte);
    return { order: row, pdf: { base64: btoa(binary), filename: pdf.filename, mime: pdf.mime } };
  });

/** Guest access requires the existing verified, hashed, expiring checkout cookie. */
export const getGuestOrderReceipt = createServerFn({ method: 'POST' })
  .inputValidator((input: { orderId: string; pdf?: boolean }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orderId)) throw new Error('Order not found');
    return { orderId: input.orderId, pdf: input.pdf === true };
  })
  .handler(async ({ data }) => {
    const { resolveBuyer } = await import('./checkout-buyer.server');
    const buyer = await resolveBuyer('guest');
    if (buyer.kind !== 'guest') throw new Error('Use member receipt access');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('orders').select(RECEIPT_ORDER_COLUMNS)
      .eq('id', data.orderId).is('user_id', null).eq('guest_session_id', buyer.guestSessionId).maybeSingle();
    if (result.error || !result.data) throw new Error('Order not found or access denied');
    const row = result.data as unknown as SavedReceiptOrder;
    if (!row.order_items.length) throw new Error('Order items are not complete yet');
    if (!data.pdf) return { order: row, pdf: null };
    const { generateBrandedReceiptPdf } = await import('./receipt-pdf.server');
    const pdf = await generateBrandedReceiptPdf(receiptFromOrder(row));
    let binary = ''; for (const byte of pdf.bytes) binary += String.fromCharCode(byte);
    return { order: row, pdf: { base64: btoa(binary), filename: pdf.filename, mime: pdf.mime } };
  });