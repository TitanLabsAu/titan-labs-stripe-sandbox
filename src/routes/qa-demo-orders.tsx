// TEMPORARY QA fixture: real Admin StatusSelect with throwaway demo records. Remove after screenshots.
import { createFileRoute } from "@tanstack/react-router";
import { StatusSelect } from "@/routes/_authenticated/admin";

export const Route = createFileRoute("/qa-demo-orders")({ component: Demo });

const base = { tracking_number: null, tracking_status: null, delivered_at: null, payment_reference: null, contact_name: "Demo Member", contact_email: "demo@example.test", contact_phone: null, shipping_address: null, notes: null, customer: null, user_id: "demo-user", subtotal: 60, shipping: 20, total: 80, created_at: "2026-10-14T01:00:00Z", order_items: [] };
const rows: [string, any][] = [
  ["Active · unpaid PayID", { ...base, id: "d3", order_number: 9003, status: "processing", payment_method: "payid", payment_confirmed: false }],
  ["Closed · cancelled card", { ...base, id: "d2", order_number: 9002, status: "cancelled", payment_method: "card", payment_confirmed: false }],
  ["Removed tab · archived", { ...base, id: "d4", order_number: 9004, status: "cancelled", payment_method: "payid", payment_confirmed: false, archived_at: "2026-10-14T07:00:00Z" }],
  ["Active · paid PayID", { ...base, id: "d1", order_number: 9001, status: "processing", payment_method: "payid", payment_confirmed: true }],
];
function Demo() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">QA demo — throwaway records only · menus shown expanded</p>
      {rows.map(([label, o]) => (
        <div key={o.id} data-row className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 text-sm">
          <span>TL-{o.order_number} · {label}</span>
          <StatusSelect order={o} />
        </div>
      ))}
    </div>
  );
}
