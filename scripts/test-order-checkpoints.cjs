const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');

function compile(file, mocks = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
  }}).outputText;
  vm.runInNewContext(js, {exports, Date, console: {error() {}}, require(path) {return mocks[path] || require(path)}});
  return exports;
}

async function scenario(kind, overrides = {}, failure = false, suppressed = false, attempts = 0) {
  const calls = [], updates = [], alerts = [];
  const order = {id: 'test-order', order_number: 1056, status: kind === 'delivered' ? 'delivered' : 'shipped',
    total: 288, payment_confirmed: true, contact_email: 'buyer@example.com', contact_name: 'Test Buyer',
    tracking_number: 'TRACK123', notes: 'Shipping: Standard tracked', ...overrides};
  const db = {from(table) {
    const q = {select() {return q}, is() {return q}, lte() {return q}, order() {return q}, limit() {return q}, eq() {return q},
      single: async () => ({data: order}), update(value) {updates.push(value);return q},
      insert(value) {alerts.push(value);return q},
      then(resolve) {return Promise.resolve({data: table === 'order_checkpoint_email_queue' ? [{order_id: order.id, kind, attempts}] : null}).then(resolve)}};
    return q;
  }};
  const worker = compile('src/lib/order-checkpoint-email.server.ts', {
    '@/integrations/supabase/client.server': {supabaseAdmin: db},
    '@/lib/email-templates/send-email': {sendTemplateEmail: async (...args) => {
      calls.push(args);if (failure) throw new Error('provider unavailable');
      return suppressed ? {sent: false, reason: 'recipient_suppressed'} : {sent: true};
    }},
  });
  const result = await worker.sendPendingOrderCheckpointEmails(order.id);
  await worker.tryOrderCheckpointEmails(order.id);
  return {calls, updates, alerts, result};
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
  const email = compile('src/lib/email-templates/order-checkpoint.tsx');
  const deliveryText = await render(React.createElement(email.OrderCheckpoint, {kind: 'delivered', orderNumber: 'TL-1056', trackingNumber: 'TRACK123'}), {plainText: true});
  assert.match(deliveryText, /marked delivered/);
  assert.match(deliveryText, /TRACK123/);
  assert.doesNotMatch(deliveryText, /Live Orders|Closed Orders|Customer:/);
  const paymentText = await render(React.createElement(email.OrderCheckpoint, {kind: 'payment-confirmed', orderNumber: 'TL-1056'}), {plainText: true});
  assert.match(paymentText, /Payment for order TL-1056 is confirmed/);
  console.log('Checkpoint email, retry, suppression and delivery-status checks passed');
})().catch(error => {console.error(error);process.exitCode = 1});
