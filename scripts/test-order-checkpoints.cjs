const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');

function compile(file, mocks = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
  }}).outputText;
  vm.runInNewContext(js, {exports, Date, Error, console: {error() {}}, require(path) {return mocks[path] || require(path)}});
  return exports;
}

async function scenario(kind, overrides = {}, failure = false, suppressed = false, attempts = 0, enabled = false) {
  const calls = [], copies = [], updates = [], alerts = [];
  const order = {id: 'test-order', order_number: 1056, status: kind === 'delivered' ? 'delivered' : 'shipped',
    total: 288, payment_confirmed: true, contact_email: 'buyer@example.com', contact_name: 'Test Buyer',
    tracking_number: 'TRACK123', notes: 'Shipping: Standard tracked', order_items: [{product_name: 'Sample', quantity: 1, unit_price: 288}], ...overrides};
  const db = {from(table) {
    const q = {select() {return q}, is() {return q}, lte() {return q}, order() {return q}, limit() {return q}, eq() {return q},
      single: async () => ({data: order}), update(value) {updates.push(value);return q},
      insert(value) {alerts.push(value);return q},
      then(resolve) {return Promise.resolve({data: table === 'order_checkpoint_email_queue' ? [{order_id: order.id, kind, attempts}] : null}).then(resolve)}};
    return q;
  }};
  const prep = {};
  const prepJs = ts.transpileModule(fs.readFileSync('src/lib/required-receipt-email.server.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(prepJs, {exports: prep, Error, process: {env: enabled ? {TITAN_RECEIPT_ATTACHMENTS_ENABLED: 'true'} : {}}, require(path) {
    if (path.includes('order-receipt')) return {receiptFromOrder: x => x};
    if (path.includes('receipt-pdf')) return {generateBrandedReceiptPdf: async () => ({bytes: []})};
    throw new Error(path);
  }});
  const worker = compile('src/lib/order-checkpoint-email.server.ts', {
    '@/lib/required-receipt-email.server': prep,
    '@/integrations/supabase/client.server': {supabaseAdmin: db},
    '@/lib/order-admin-copy.server': {sendAdminOrderCopy: async (...args) => { copies.push(args); }},
    '@/lib/email-templates/send-email': {sendTemplateEmail: async (...args) => {
      calls.push(args);if (failure === true) throw new Error('provider unavailable');
      return suppressed ? {sent: false, reason: 'recipient_suppressed'} : {sent: true};
    }},
  });
  const result = await worker.sendPendingOrderCheckpointEmails(order.id);
  await worker.tryOrderCheckpointEmails(order.id);
  return {calls, copies, updates, alerts, result};
}

(async () => {
  const statuses = compile('src/lib/tracking-status.ts');
  for (const status of ['Delivered', ' delivered ', 'Delivered in Full', 'Item Delivered']) assert.equal(statuses.isCompletedDelivery(status), true);
  for (const status of [null, 'Out for delivery', 'On Board for Delivery', 'Cannot be delivered', 'Unsuccessful Delivery', 'To be Re-Delivered', 'Partial Delivery', 'In transit']) assert.equal(statuses.isCompletedDelivery(status), false);
  for (const kind of ['payment-confirmed', 'dispatched', 'delivered']) {
    const sent = await scenario(kind);
    assert.equal(sent.calls[0][1], 'buyer@example.com', 'checkpoint goes to customer');
    assert.equal(sent.calls[0][2].templateData.total, '$288.00 AUD');
    assert.equal(sent.calls[0][2].idempotencyKey, sent.calls[1][2].idempotencyKey, 'retry key must stay stable');
    assert.equal(sent.updates[0].outcome, 'sent');
    assert.equal(sent.copies.length, 2, 'successful sends invoke the independently keyed admin copy');
    assert.equal(sent.copies[0][2], sent.calls[0][2].idempotencyKey);
    assert.equal((await scenario(kind, {}, true)).copies.length, 0, 'failed customer sends do not copy');
    assert.equal((await scenario(kind, {}, false, true)).copies.length, 0, 'suppressed customer sends do not copy');
    assert.equal((await scenario(kind, {status: 'cancelled'})).calls.length, 0);
  }
  assert.equal((await scenario('payment-confirmed', {payment_confirmed: false})).calls.length, 0);
  assert.equal((await scenario('dispatched', {tracking_number: ''})).calls.length, 0);
  assert.equal((await scenario('dispatched', {status: 'delivered'})).updates[0].outcome, 'superseded');
  const failed = await scenario('delivered', {}, true, false, 2);
  assert.equal(failed.updates[0].attempts, 3);
  assert.ok(!failed.updates[0].completed_at, 'failure remains retryable');
  assert.equal(failed.alerts[0].title, 'Order email needs attention');
  const suppressed = await scenario('delivered', {}, false, true);
  assert.equal(suppressed.updates[0].outcome, 'recipient_suppressed');
  assert.equal(suppressed.result.sent, 0);

  const React = require('react');
  const {render} = require('@react-email/render');
  const email = compile('src/lib/email-templates/order-checkpoint.tsx', { './order-receipt-content': compile('src/lib/email-templates/order-receipt-content.tsx', { '../receipt-brand': compile('src/lib/receipt-brand.ts'), '../order-receipt': compile('src/lib/order-receipt.ts') }) });
  const deliveryText = await render(React.createElement(email.OrderCheckpoint, {kind: 'delivered', orderNumber: 'TL-1056', trackingNumber: 'TRACK123'}), {plainText: true});
  assert.match(deliveryText, /marked delivered/);
  assert.match(deliveryText, /TRACK123/);
  assert.doesNotMatch(deliveryText, /Live Orders|Closed Orders|Customer:/);
  assert.equal((await scenario('payment-confirmed', {}, 'attachment')).calls.length, 2, 'OFF preserves payment confirmations');
  const blocked = await scenario('payment-confirmed', {}, false, false, 0, true);
  assert.equal(blocked.calls.length, 0);
  assert.match(blocked.updates[0].last_error, /^RECEIPT_ATTACHMENT_UNSUPPORTED/);
  assert.ok(!blocked.updates[0].completed_at);
  console.log('Checkpoint email, retry, suppression and delivery-status checks passed');
})().catch(error => {console.error(error);process.exitCode = 1});

