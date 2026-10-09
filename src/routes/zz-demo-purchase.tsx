import { createFileRoute } from "@tanstack/react-router";
import { StockPurchaseForm } from "@/components/StockPurchaseForm";
const demo = [
  { id: "11111111-1111-4111-8111-111111111111", name: "DEMO Retatrutide", catalogue_section: "range", product_variants: [{ id: "a", label: "10mg", stock: 4 }, { id: "b", label: "20mg", stock: 0 }] },
  { id: "22222222-2222-4222-8222-222222222222", name: "DEMO Pen Pins", catalogue_section: "equipment", unlimited_stock: true, product_variants: [] },
];
export const Route = createFileRoute("/zz-demo-purchase")({ component: () => (
  <div className="mx-auto max-w-5xl p-4"><p className="mb-2 font-bold">DEMO DATA — temporary fixture</p>
  <StockPurchaseForm occurredOn="2026-10-10" supplier="Demo" description="" products={demo} onSaved={() => {}} /></div>) });
