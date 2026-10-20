import { receiptFromOrder, type SavedReceiptOrder } from './order-receipt';
import { generateBrandedReceiptPdf } from './receipt-pdf.server';

export const RECEIPT_ATTACHMENT_BLOCKER = 'RECEIPT_ATTACHMENT_UNSUPPORTED: managed email API and installed email-js 0.1.0 do not support PDF attachments';
/** Required receipts fail closed. Existing caller retries retain the same event key.
 * No invented attachment payload, send without receipt, or silent link fallback. */
export async function prepareRequiredReceiptEmail(order: SavedReceiptOrder) {
  const snapshot = order.pricing_snapshot as { quote?: { itemsCents?: number }; receipt_item_count?: number } | null;
  if (!order.order_items.length || (snapshot?.receipt_item_count != null && snapshot.receipt_item_count !== order.order_items.length)) throw new Error('RECEIPT_ITEMS_INCOMPLETE');
  const sum = order.order_items.reduce((a, i) => a + Math.round(Number(i.unit_price) * 100) * i.quantity, 0);
  if (snapshot?.quote?.itemsCents != null && sum !== snapshot.quote.itemsCents) throw new Error('RECEIPT_ITEMS_INCOMPLETE');
  const receipt = receiptFromOrder(order);
  await generateBrandedReceiptPdf(receipt); // Generation failures remain retryable too.
  throw new Error(RECEIPT_ATTACHMENT_BLOCKER);
}