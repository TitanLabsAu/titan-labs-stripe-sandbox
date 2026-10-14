// TEMPORARY QA fixture: real Admin components with throwaway demo records. Remove after screenshots.
import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AdminMembers } from "@/components/AdminMembers";
import { StatusSelect } from "@/routes/_authenticated/admin";

export const Route = createFileRoute("/qa-demo-orders")({ component: Demo });

const base = { tracking_number: null, tracking_status: null, delivered_at: null, payment_reference: null, contact_name: "Demo Member", contact_email: "demo@example.test", contact_phone: null, shipping_address: null, notes: null, customer: null, user_id: "demo-user" };
const orders: any[] = [
  { ...base, id: "d1", order_number: 9001, status: "processing", payment_method: "payid", payment_confirmed: true, subtotal: 102, shipping: 20, total: 122, created_at: "2026-10-14T01:50:00Z", order_items: [{ id: "i1", product_name: "Demo Peptide", product_slug: "demo", unit_price: 102, quantity: 1 }] },
  { ...base, id: "d2", order_number: 9002, status: "cancelled", payment_method: "card", payment_confirmed: true, subtotal: 97.2, shipping: 20, total: 117.2, created_at: "2026-10-14T01:43:00Z", order_items: [{ id: "i2", product_name: "Demo Peptide", product_slug: "demo", unit_price: 108, quantity: 1 }] },
  { ...base, id: "d3", order_number: 9003, status: "processing", payment_method: "payid", payment_confirmed: false, subtotal: 60, shipping: 20, total: 80, created_at: "2026-10-13T01:00:00Z", order_items: [{ id: "i3", product_name: "Demo Pen", product_slug: "demo-pen", unit_price: 60, quantity: 1 }] },
];
const member: any = { id: "demo-user", email: "demo@example.test", first_name: "Demo", last_name: "Member (QA)", phone_number: null, address_line: null, city: null, state: null, postcode: null, postal_address: null, created_at: "2026-10-01T00:00:00Z", order_count: 1, live_count: 1, delivered_count: 0, total_spent: 122, last_order_at: "2026-10-14T01:50:00Z", top_products: [] };

function Demo() {
  const [qc] = useState(() => {
    const c = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    c.setQueryData(["admin-members"], [member]);
    c.setQueryData(["admin-member-orders", "demo-user"], orders);
    return c;
  });
  return (
    <QueryClientProvider client={qc}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">QA demo — throwaway records only</p>
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-4 text-sm">
              <span>TL-{o.order_number} · {o.payment_method} · {o.payment_confirmed ? "paid" : "unpaid"} · ${o.total}</span>
              <StatusSelect order={o} />
            </div>
          ))}
        </div>
        <AdminMembers />
      </div>
    </QueryClientProvider>
  );
}
