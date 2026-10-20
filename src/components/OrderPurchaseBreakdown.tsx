import { receiptFromOrder, receiptMoney, receiptDate, type SavedReceiptOrder } from '@/lib/order-receipt';

export function OrderPurchaseBreakdown({ order }: { order: SavedReceiptOrder }) {
  const r = receiptFromOrder(order);
  return <section className="space-y-4" aria-label="Purchase breakdown">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-bold">Purchase breakdown</h3><span className="text-sm font-semibold text-primary">{r.status}</span></div>
    <div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr><th className="py-2 pr-4">Product / saved size & pack</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Unit</th><th className="py-2 pl-2 text-right">Line total</th></tr></thead><tbody>{r.lines.map((line, index) => <tr key={index} className="border-b border-border"><td className="min-w-36 py-3 pr-4"><p className="font-semibold">{line.name}</p><p className="text-xs text-muted-foreground">{line.sizePack}</p>{line.originalUnitCents != null && <p className="text-xs text-muted-foreground">Original unit {receiptMoney(line.originalUnitCents)} · Original line {receiptMoney(line.originalUnitCents * line.quantity)}</p>}</td><td className="p-2 text-right">{line.quantity}</td><td className="whitespace-nowrap p-2 text-right">{receiptMoney(line.unitCents)}</td><td className="whitespace-nowrap py-2 pl-2 text-right">{receiptMoney(line.lineCents)}</td></tr>)}</tbody></table></div>
    <div className="space-y-4 sm:hidden">{r.lines.map((line, index) => <div key={index} className="border-b border-border pb-3"><p className="font-semibold">{line.name}</p><p className="text-xs text-muted-foreground">{line.sizePack}</p>{line.originalUnitCents != null && <p className="text-xs text-muted-foreground">Original unit {receiptMoney(line.originalUnitCents)} · Original line {receiptMoney(line.originalUnitCents * line.quantity)}</p>}<div className="mt-2 flex flex-wrap justify-between gap-2 text-sm"><span>{line.quantity} × {receiptMoney(line.unitCents)}</span><span className="font-semibold">{receiptMoney(line.lineCents)}</span></div></div>)}</div>
    <dl className="ml-auto max-w-lg space-y-2 text-sm">
      <Amount label="Merchandise before extra discounts" cents={r.beforeCents}/>
      {r.discounts.map(d => <Amount key={d.label} label={d.label} cents={-d.cents}/>)}
      {r.reconciliationCents > 0 && <Amount label="Saved total adjustment — detail unavailable" cents={r.reconciliationCents}/>}
      <Amount label="Merchandise after discounts" cents={r.merchandiseCents}/><Amount label={r.shippingLabel} cents={r.shippingCents}/>
      <div className="border-t border-border pt-3 font-bold"><Amount label="Final total (AUD)" cents={r.totalCents}/></div>
      {r.amountPaidCents != null && <Amount label={r.status === 'Refunded' ? 'Originally paid' : 'Amount paid'} cents={r.amountPaidCents}/>}
      {r.balanceCents != null && <Amount label="Balance" cents={r.balanceCents}/>}
    </dl>
    <p className="text-sm text-muted-foreground">{r.payment}{r.paidAt ? ` · Payment recorded ${receiptDate(r.paidAt)}` : ''}</p>
    {r.builtInSavings > 0 && <p className="text-xs text-muted-foreground">Built-in pack savings {receiptMoney(r.builtInSavings)} are already included in item prices, not deducted again.</p>}
    {r.originalTotalCents != null && r.builtInSavings > 0 && <p className="text-xs text-muted-foreground">Saved reference total {receiptMoney(r.originalTotalCents)}.</p>}
    {r.capNote && <p className="text-xs text-muted-foreground">{r.capNote}</p>}{r.warnings.map(w => <p key={w} className="text-xs text-muted-foreground">{w}</p>)}
  </section>;
}
function Amount({ label, cents }: { label: string; cents: number }) { return <div className="flex justify-between gap-4"><dt>{label}</dt><dd className="shrink-0 tabular-nums">{cents < 0 ? '−' : ''}{receiptMoney(Math.abs(cents))}</dd></div>; }