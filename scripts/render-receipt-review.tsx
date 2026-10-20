import React from 'react';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { render } from '@react-email/render';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderConfirmation } from '../src/lib/email-templates/order-confirmation';
import { OrderCheckpoint } from '../src/lib/email-templates/order-checkpoint';
import { OrderPurchaseBreakdown } from '../src/components/OrderPurchaseBreakdown';
import { generateReceiptPdf } from '../src/lib/receipt-pdf.server';
import { receiptFromOrder } from '../src/lib/order-receipt';
import { alexPaid, alexPending, alexMultipage } from './receipt-fixtures';

const out = '/tmp/receipt-review'; await mkdir(out, { recursive: true });
const logo = new Uint8Array(await readFile('/tmp/receipt/logo.png'));
for (const [name, order] of [['paid', alexPaid], ['pending', alexPending], ['multipage', alexMultipage]] as const) {
  const pdf = await generateReceiptPdf(receiptFromOrder(order), logo); await writeFile(`${out}/Alex-${name}.pdf`, pdf.bytes);
}
const receipt = receiptFromOrder(alexPaid);
for (const [name, element] of [
  ['confirmation', <OrderConfirmation customerName="Alex" orderNumber="TL-900002" orderId={alexPending.id} receipt={receiptFromOrder(alexPending)}/>],
  ['payment', <OrderCheckpoint customerName="Alex" orderNumber="TL-900001" orderId={alexPaid.id} receipt={receipt}/>],
] as const) await writeFile(`${out}/${name}.html`, await render(element));
await writeFile(`${out}/admin.html`, renderToStaticMarkup(<main className="page-shell py-8"><p className="text-primary text-sm font-bold">TITAN LABS AUSTRALIA · ADMIN</p><h1 className="font-display text-3xl font-bold mb-6">Order TL-900001</h1><p className="text-muted-foreground mb-6">Alex Example · Fictional owner-review example</p><OrderPurchaseBreakdown order={alexPaid}/></main>));
console.log('Fictional PDFs and rendered email/Admin drafts saved to', out);