// TEMPORARY QA-ONLY FIXTURE — mocked data, no writes. Delete before commit.
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ProductEditor, toDraft, type Draft } from "@/components/AdminProducts";
import { AdminEdits } from "@/components/AdminEdits";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { formatPrice, type Product } from "@/lib/products";
import type { AdminProduct } from "@/lib/admin.functions";

export const Route = createFileRoute("/qa-fixture")({
  head: () => ({ meta: [{ title: "QA fixture" }, { name: "robots", content: "noindex" }] }),
  component: Fixture,
});

const variants = [
  { id: "demo-5mm", label: "5mm 31g Pen Needles", price: 5, stock: 40, cost: 1.8, packSize: 10 },
  { id: "demo-4mm", label: "4mm 32g Pen Needles", price: 5, stock: 25, cost: 1.8, packSize: 10 },
  { id: "demo-8mm", label: "8mm 31g Pen Needles", price: 5, stock: 6, cost: 1.8, packSize: 10 },
  { id: "demo-mixed", label: "Mixed 10 (assorted)", price: 6, stock: 12, cost: 2.2, packSize: 10 },
];
const adminDemo: AdminProduct = {
  id: "demo-id", slug: "demo-pen-pins", name: "DEMO Pen Pins (QA mock)", price: 5, sale_price: null, promo_label: "",
  kit_price: null, product_variants: variants as any, image_url: "/images/product-light/titan-pen-pins-480.webp",
  alt: "Demo pen pins", blurb: "Demo only", description: "QA mock product — not saved.", details: [], categories: [],
  protocol: "", recon_vial_mg: null, recon_water_ml: null, recon_dose_mg: null, recon_notes: "", product_links: [],
  active: true, sort_order: 0, stock_quantity: 83, catalogue_section: "equipment", starter_kit_enabled: true, unlimited_stock: false,
};
const demo: Product = {
  slug: "demo-pen-pins", name: "DEMO Pen Pins", price: 5, image: adminDemo.image_url, alt: "Demo pen pins",
  blurb: "", details: [], catalogueSection: "equipment", variants,
};

function CartTotals() {
  const { items } = useCart();
  const line = items.find((i) => i.slug === demo.slug);
  if (!line) return <p data-qa="totals">Cart: empty</p>;
  const v = variants.find((x) => x.id === line.variantId)!;
  return (
    <p data-qa="totals" className="font-bold">
      Cart line: {line.quantity} packs × {formatPrice(v.price)} = {formatPrice(line.quantity * v.price)} · {line.quantity * v.packSize} items
    </p>
  );
}

function Fixture() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(adminDemo));
  const view = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("view") : null;
  useEffect(() => {
    for (const k of [["catalog-products"], ["admin-products"], ["site-content"], ["site-links"]])
      qc.setQueryDefaults(k, { staleTime: Infinity, retry: false });
    qc.setQueryData(["catalog-products"], [demo]);
    qc.setQueryData(["admin-products"], [adminDemo]);
    qc.setQueryData(["site-content"], {});
    qc.setQueryData(["site-links"], []);
    setReady(true);
  }, [qc]);
  if (!ready) return null;
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4">
      <p className="rounded border border-accent p-2 text-sm font-bold">QA FIXTURE — mocked demo data, nothing is saved</p>
      {view === "editor" ? <ProductEditor draft={draft} setDraft={setDraft} onSave={() => {}} saving={false} title="Edit product (DEMO)" /> : null}
      {view === "shop" ? (
        <div className="grid gap-4 sm:grid-cols-[320px_1fr]"><ProductCard product={demo} /><CartTotals /></div>
      ) : null}
      {view === "edits" ? <AdminEdits /> : null}
    </main>
  );
}
