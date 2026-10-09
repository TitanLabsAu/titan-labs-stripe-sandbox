// TEMPORARY local QA fixture — deleted after screenshots. DEMO data only.
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminInventory } from "@/components/AdminInventory";
import { buildSkus } from "@/lib/inventory";
export const Route = createFileRoute("/zz-inventory-fixture")({ ssr: false, component: Fixture });
const demo = buildSkus([
  { id: "1", slug: "reta", name: "DEMO Retatrutide", active: true, stock_quantity: 0, catalogue_section: "range", product_variants: [
    { id: "a", label: "10mg", stock: 24, cost: 38 }, { id: "b", label: "20mg", stock: 4, cost: 55 }, { id: "c", label: "30mg", stock: 0, cost: 70 }] },
  { id: "2", slug: "bpc", name: "DEMO BPC-157", active: true, stock_quantity: 0, catalogue_section: "range", product_variants: [{ id: "d", label: "10mg", stock: 31 }] },
  { id: "3", slug: "pen", name: "DEMO Titan Pen", active: false, coming_soon: true, stock_quantity: 2, catalogue_section: "pens", product_variants: [] },
  { id: "4", slug: "sharps", name: "DEMO Sharps container", active: true, stock_quantity: 0, catalogue_section: "equipment", unlimited_stock: true, product_variants: [] },
], new Map());
function Fixture() {
  const qc = useQueryClient();
  useState(() => {
    qc.setQueryDefaults(["admin-inventory"], { staleTime: Infinity });
    qc.setQueryDefaults(["inventory-history"], { staleTime: Infinity });
    qc.setQueryData(["admin-inventory"], { skus: demo, fetchedAt: new Date().toISOString(), trackingSince: "2026-10-10T00:00:00Z" });
    qc.setQueryData(["inventory-history", "1::b"], [{ id: "m", kind: "receive", before_qty: 0, delta: 4, after_qty: 4, reason: "DEMO supplier delivery", reference: "INV-001", created_at: "2026-10-10T01:00:00Z", variant_label: "20mg" }]);
    return 0;
  });
  return <div className="mx-auto max-w-6xl p-4"><p className="mb-3 rounded bg-muted p-2 text-sm">DEMO DATA — local QA fixture</p><AdminInventory /></div>;
}
