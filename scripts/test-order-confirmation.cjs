const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('src/lib/order-confirmation.server.ts', 'utf8');
const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;

async function scenario({paid = false, fail = false, suppressed = false, lines = true, cancelled = false} = {}) {
  const calls = [], copies = [], updates = [];
  const order = {id: 'order-1', order_number: 1056, total: 288, status: cancelled ? 'cancelled' : 'processing',
    payment_confirmed: paid, contact_email: 'buyer@example.com', contact_name: 'Test Buyer', notes: 'Shipping: Standard tracked (3-7 days)',
    order_items: lines ? [{product_name: 'Sample', variant_label: 'Single vial', quantity: 2, unit_price: 160}] : []};
  const db = {from(table) {
    const q = {select() {return q}, is() {return q}, order() {return q}, limit() {return q}, eq() {return q},
      single: async () => ({data: order}), update(value) {updates.push(value);return q},
      then(resolve) {return Promise.resolve({data: table === 'order_confirmation_queue' ? [{order_id: order.id}] : order}).then(resolve)}};
    return q;
  }};
  const exports = {};
  vm.runInNewContext(js, {exports, console: {error() {}}, require(path) {
    if (path.includes('required-receipt-email.server')) return {prepareRequiredReceiptEmail: async () => { if (fail === 'attachment') throw new Error('RECEIPT_ATTACHMENT_UNSUPPORTED'); }};
    if (path.includes('order-admin-copy.server')) return {sendAdminOrderCopy: async (...args) => {copies.push(args)}};
    if (path.includes('client.server')) return {supabaseAdmin: db};
    if (path.includes('send-email')) return {sendTemplateEmail: async (...args) => {
      calls.push(args);if (fail) throw new Error('temporary provider failure');
      return suppressed ? {sent: false, reason: 'recipient_suppressed'} : {sent: true};
    }};
    throw new Error(path);
  }});
  const result = await exports.sendPendingOrderConfirmations(order.id);
  // Checkout remains successful even if provider or queue is unavailable.
  await exports.tryOrderConfirmation(order.id);
  return {calls, copies, updates, result};
}

(async () => {
  const pending = await scenario();
  assert.equal(pending.calls[0][1], 'buyer@example.com');
  assert.equal(pending.copies.length, 2);
  assert.equal(pending.copies[0][2], pending.calls[0][2].idempotencyKey);
  assert.equal((await scenario({fail: true})).copies.length, 0);
  assert.equal((await scenario({suppressed: true})).copies.length, 0);
  assert.equal(pending.calls[0][2].templateData.total, '$288.00 AUD');
  assert.equal(pending.calls[0][2].templateData.items[0], '2 × Sample (Single vial) — $320.00 AUD');
  assert.equal(pending.calls[0][2].templateData.paymentConfirmed, false);
  assert.equal(pending.calls[0][2].templateData.shippingMethod, 'Standard tracked');
  assert.equal(pending.calls[0][2].idempotencyKey, pending.calls[1][2].idempotencyKey);
  assert.equal((await scenario({paid: true})).calls[0][2].templateData.paymentConfirmed, true);
  assert.equal((await scenario({fail: true})).updates.length, 0, 'failed emails remain queued');
  const suppressed = await scenario({suppressed: true});
  assert.equal(suppressed.result.sent, 0);
  assert.equal(suppressed.updates[0].outcome, 'recipient_suppressed');
  assert.equal((await scenario({lines: false})).calls.length, 0, 'do not send an incomplete order');
  assert.equal((await scenario({cancelled: true})).calls.length, 0, 'do not confirm cancelled orders');
  const blocked = await scenario({fail: 'attachment'});
  assert.equal(blocked.calls.length, 0, 'required attachment failure sends nothing');
  assert.equal(blocked.updates.length, 0, 'required attachment failure leaves event pending');
  console.log('Order confirmation checks passed');
})().catch(e => {console.error(e);process.exitCode = 1});

