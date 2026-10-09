import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AdminFinance, rangeFor } from "@/components/AdminFinance";
const P = [
  { id: "11111111-1111-4111-8111-111111111111", slug: "demo-reta", name: "DEMO Retatrutide", catalogue_section: "range", product_variants: [{ id: "a", label: "10mg", stock: 4 }, { id: "b", label: "20mg", stock: 0 }] },
  { id: "22222222-2222-4222-8222-222222222222", slug: "demo-pins", name: "DEMO Pen Pins", catalogue_section: "equipment", unlimited_stock: true, product_variants: [] },
];
function Fixture() {
  const [qc] = useState(() => {
    const c = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false, refetchOnWindowFocus: false } } });
    const r = rangeFor("month");
    c.setQueryData(["admin-products"], P);
    c.setQueryData(["admin-finance", r.from, r.to], { from: r.from, to: r.to, orders: 2, units: 3, revenue: 300, shipping: 20, productRevenue: 280, cogs: 90, grossProfit: 190, stockSpend: 170, otherSpend: 15, totalSpend: 185, netProfit: 195, averageOrder: 150, missingCosts: 0, spendByCategory: [], products: [], inventoryUnits: 4, inventoryCost: 80, inventoryRetail: 400 });
    c.setQueryData(["admin-expenses"], [
      { id: "e1", occurred_on: r.to, category: "stock", supplier: "DEMO Supplier Co", description: "DEMO invoice #42", amount: 120, product_slug: null, variant_label: null, quantity: null, restocked: true, other_costs_cents: 1200, discount_cents: 200,
        items: [
          { id: "i1", line_no: 1, product_name: "DEMO Retatrutide", variant_label: "10mg", quantity: 3, line_cost_cents: 6010, untracked: false, stock_applied: true },
          { id: "i2", line_no: 2, product_name: "DEMO Retatrutide", variant_label: "20mg", quantity: 2, line_cost_cents: 4020, untracked: false, stock_applied: true },
          { id: "i3", line_no: 3, product_name: "DEMO Pen Pins", variant_label: null, quantity: 5, line_cost_cents: 970, untracked: true, stock_applied: false },
        ] },
      { id: "e2", occurred_on: r.from, category: "stock", supplier: "DEMO legacy", description: "DEMO single-item (older record)", amount: 50, product_slug: "demo-reta", variant_label: "10mg", quantity: 2, restocked: true, items: [] },
      { id: "e3", occurred_on: r.from, category: "shipping", supplier: "DEMO Post", description: "", amount: 15, product_slug: null, variant_label: null, quantity: null, restocked: false, items: [] },
    ]);
    return c;
  });
  return <QueryClientProvider client={qc}><div className="mx-auto max-w-6xl p-4"><p className="mb-3 font-bold">DEMO DATA — temporary QA fixture</p><AdminFinance /></div></QueryClientProvider>;
}
export const Route = createFileRoute("/zz-demo-finance")({ ssr: false, component: Fixture });
