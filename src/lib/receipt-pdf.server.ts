import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { RECEIPT_FONT_BASE64 } from './receipt-font';
import { RECEIPT_BRAND as brand } from './receipt-brand';
import { receiptDate, receiptMoney, type Receipt } from './order-receipt';

const colour = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const bytesFromBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

/** Pure in-memory A4 generation; no filesystem, public PII uploads or current-price reads. */
export async function generateReceiptPdf(receipt: Receipt, logoBytes: Uint8Array) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font = await doc.embedFont(bytesFromBase64(RECEIPT_FONT_BASE64), { subset: true });
  const logo = await doc.embedPng(logoBytes);
  doc.setTitle(`${receipt.title} ${receipt.reference}`); doc.setAuthor(brand.name);
  let page: PDFPage = doc.addPage([595.28, 841.89]); let y = 0;
  const pages: PDFPage[] = [];
  const text = (value: string, x: number, at: number, size = 10, ink = brand.charcoal) => page.drawText(value, { x, y: at, size, font, color: colour(ink) });
  const wrap = (value: string, width: number, size = 10) => {
    const out: string[] = []; let current = '';
    for (const word of value.replace(/[\r\n]+/g, ' ').split(/\s+/)) {
      if (font.widthOfTextAtSize(word, size) > width) {
        if (current) { out.push(current); current = ''; }
        let part = ''; for (const c of word) { if (font.widthOfTextAtSize(part + c, size) > width && part) { out.push(part); part = ''; } part += c; } current = part;
      } else if (current && font.widthOfTextAtSize(`${current} ${word}`, size) > width) { out.push(current); current = word; }
      else current = current ? `${current} ${word}` : word;
    } if (current) out.push(current); return out;
  };
  const header = (first: boolean) => {
    pages.push(page);
    page.drawRectangle({ x: 0, y: 740, width: 595.28, height: 102, color: colour(brand.ink) });
    page.drawRectangle({ x: 0, y: 736, width: 595.28, height: 4, color: colour(brand.blue) });
    page.drawImage(logo, { x: 38, y: 758, width: 64, height: 64 });
    text('TITAN LABS AUSTRALIA', 120, 799, 18, brand.white);
    text(receipt.title.toUpperCase(), 120, 775, 11, brand.white);
    y = 711; text(receipt.reference, 38, y, 16, brand.blue); text(receipt.status, 360, y, 12); y -= 21;
    text(`Order date: ${receiptDate(receipt.date)} (Melbourne)`, 38, y); y -= 18;
    if (first) {
      text(`Payment: ${receipt.payment}`, 38, y); y -= 15;
      if (receipt.paidAt) { text(`Paid date recorded: ${receiptDate(receipt.paidAt)}`, 38, y); y -= 15; }
      if (receipt.customer.name) { text(receipt.customer.name, 38, y, 11); y -= 15; }
      for (const value of [receipt.customer.email, receipt.customer.phone, receipt.customer.address].filter(Boolean)) {
        for (const line of wrap(value, 515)) { text(line, 38, y); y -= 15; }
      } y -= 8;
    } else y -= 14;
  };
  const tableHead = () => { page.drawRectangle({ x: 38, y: y - 9, width: 519, height: 26, color: colour(brand.pale) }); text('Product / saved size & pack', 46, y); text('Qty', 338, y); text('Unit (AUD)', 382, y); text('Line (AUD)', 470, y); y -= 30; };
  const ensure = (height: number, table = false) => { if (y - height < 85) { page = doc.addPage([595.28, 841.89]); header(false); if (table) tableHead(); } };
  header(true); tableHead();
  for (const line of receipt.lines) {
    const name = wrap(line.name, 275, 11), size = wrap(line.sizePack, 275, 9);
    const originals = line.originalUnitCents != null ? wrap(`Original unit: ${receiptMoney(line.originalUnitCents)}`, 275, 9) : [];
    const height = (name.length + size.length + originals.length) * 15 + 10;
    ensure(height, true);
    let at = y;
    for (const s of name) { text(s, 46, at, 11); at -= 15; }
    for (const s of [...size, ...originals]) { text(s, 46, at, 9, brand.muted); at -= 15; }
    text(String(line.quantity), 342, y); text(`$${(line.unitCents / 100).toFixed(2)}`, 382, y); text(`$${(line.lineCents / 100).toFixed(2)}`, 470, y);
    y -= height; page.drawLine({ start: { x: 38, y: y + 12 }, end: { x: 557, y: y + 12 }, thickness: 0.4, color: colour(brand.muted) });
  }
  y -= 10;
  const amount = (label: string, value: number, total = false) => {
    const labels = wrap(label, 365, total ? 12 : 10); ensure(labels.length * 16 + 12);
    if (total) page.drawRectangle({ x: 38, y: y - 12, width: 519, height: labels.length * 16 + 14, color: colour(brand.blue) });
    for (let i = 0; i < labels.length; i++) text(labels[i] ?? '', 46, y - i * 16, total ? 12 : 10, total ? brand.white : brand.charcoal);
    const valueText = `${value < 0 ? '−' : ''}$${(Math.abs(value) / 100).toFixed(2)}`;
    text(valueText, 550 - font.widthOfTextAtSize(valueText, total ? 12 : 10), y, total ? 12 : 10, total ? brand.white : brand.charcoal);
    y -= labels.length * 16 + 6;
  };
  amount('Merchandise before extra discounts', receipt.beforeCents);
  for (const d of receipt.discounts) amount(d.label, -d.cents);
  if (receipt.reconciliationCents) amount('Saved total adjustment — detail unavailable', receipt.reconciliationCents);
  amount('Merchandise after discounts', receipt.merchandiseCents); amount(receipt.shippingLabel, receipt.shippingCents);
  ensure(80); amount('TOTAL AUD', receipt.totalCents, true);
  if (receipt.amountPaidCents != null) amount(receipt.status === 'Refunded' ? 'Originally paid' : 'Amount paid', receipt.amountPaidCents);
  if (receipt.balanceCents != null) amount('Balance', receipt.balanceCents);
  const notes = [...receipt.warnings, ...(receipt.capNote ? [receipt.capNote] : []), ...(receipt.builtInSavings ? [`Built-in pack saving ${receiptMoney(receipt.builtInSavings)} is already included; not deducted again.`] : []), 'Titan Labs Australia · For research use only.'];
  for (const note of notes) { const lines = wrap(note, 519, 9); ensure(lines.length * 14 + 8); for (const s of lines) { text(s, 38, y, 9, brand.muted); y -= 14; } y -= 8; }
  pages.forEach((p, i) => { page = p; page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 54, color: colour(brand.ink) }); text('TITAN LABS AUS  |  titanlabsaus.com', 38, 31, 9, brand.white); text(`${receipt.reference}  ·  Page ${i + 1} of ${pages.length}`, 360, 31, 9, brand.white); });
  return { bytes: await doc.save(), filename: `${receipt.reference}-${receipt.status === 'Paid' ? 'paid-receipt' : 'order-summary'}.pdf`, mime: 'application/pdf' as const };
}

export async function generateBrandedReceiptPdf(receipt: Receipt) {
  const response = await fetch(brand.logo);
  if (!response.ok) throw new Error('Receipt logo unavailable; retry required');
  return generateReceiptPdf(receipt, new Uint8Array(await response.arrayBuffer()));
}