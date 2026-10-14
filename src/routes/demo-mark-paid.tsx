import { createFileRoute } from "@tanstack/react-router";
import { canMarkManualPaid } from "@/lib/manual-payment";

export const Route = createFileRoute("/demo-mark-paid")({ component: Demo });

const rows = [
  { n: 9001, name: "Demo Buyer A", status: "processing", payment_method: "payid", payment_confirmed: false },
  { n: 9002, name: "Demo Buyer B", status: "shipped", payment_method: "crypto", payment_confirmed: false },
  { n: 9003, name: "Demo Buyer C", status: "processing", payment_method: "payid", payment_confirmed: true },
  { n: 9004, name: "Demo Buyer D", status: "processing", payment_method: "card", payment_confirmed: false },
];

function Demo() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 text-foreground">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">DEMO DATA ONLY — dummy orders</p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((o) => (
            <tr key={o.n} className="border-b border-border/50 align-top">
              <td className="py-3 pr-4">TL-{o.n}<br /><span className="text-xs text-muted-foreground">{o.name} · {o.payment_method}</span></td>
              <td className="py-3 pr-4 text-[11px] uppercase tracking-[0.16em]">
                {o.payment_confirmed ? <span className="text-accent">Paid</span> : <span className="text-muted-foreground">Awaiting</span>}
              </td>
              <td className="py-3">
                <select size={o.n === 9001 ? 5 : 1} defaultValue={o.status} className="border border-border bg-secondary px-2 py-1 text-xs uppercase tracking-[0.12em]">
                  {["processing", "shipped", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                  {canMarkManualPaid(o) ? <option value="pay">Mark as paid</option> : null}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="max-w-md rounded-lg border border-border bg-card p-4 shadow">
        <p className="text-sm">Mark order TL-9001 as paid? The member will be emailed a payment confirmation.</p>
        <div className="mt-3 flex justify-end gap-2 text-xs uppercase"><span className="border border-border px-3 py-1">Cancel</span><span className="bg-primary px-3 py-1 text-primary-foreground">OK</span></div>
      </div>
    </div>
  );
}
