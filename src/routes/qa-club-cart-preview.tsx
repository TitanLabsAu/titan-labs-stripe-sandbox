// TEMPORARY QA fixture — dummy data only. Delete after screenshots.
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CartSheet } from "@/components/CartSheet";
import { AdminTitanClubView } from "@/components/AdminTitanClub";
import { useCart } from "@/lib/cart";
import { quoteOrder } from "@/lib/order-pricing";
import { cartPriceLines, useReferralSettings } from "@/lib/useReferralSettings";
import { useProducts } from "@/lib/useCatalog";

export const Route = createFileRoute("/qa-club-cart-preview")({
  head: () => ({ meta: [{ title: "QA fixture" }, { name: "robots", content: "noindex" }] }),
  component: Preview,
});

function Preview() {
  const qc = useQueryClient();
  const { items, addItem, getLinePrice } = useCart();
  const { products, getProduct } = useProducts();
  const { settings } = useReferralSettings();
  const [ready, setReady] = useState(false);
  const member = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("member") === "1";
  useEffect(() => {
    if (items.length === 0 && products[0]) addItem(products.find((p) => p.catalogueSection === "range")?.slug ?? products[0].slug, 3);
  }, [items.length, products, addItem]);
  useEffect(() => {
    if (!items.length) return;
    if (member) {
      const quoteItems = items.map((i) => ({ slug: i.slug, variantId: i.variantId ?? null, pack: i.pack ?? "single", quantity: i.quantity }));
      const q = quoteOrder(
        { lines: cartPriceLines(items, getProduct, getLinePrice), shippingMethod: "express", paymentMethod: "payid", foundationPercent: 5, club: { type: "percent", percent: 15, maxCapPercent: 35 } },
        settings,
      );
      qc.setQueryData(["cart-member-quote", JSON.stringify(quoteItems)], q);
    }
    setReady(true);
  }, [items, member]);
  return (
    <main className="mx-auto max-w-4xl p-6">
      <p className="mb-4 rounded border border-destructive p-2 text-sm font-bold text-destructive">QA FIXTURE — DUMMY DATA ONLY ({member ? "member server-quote state seeded" : "signed-out estimate"})</p>
      {ready ? <CartSheet /> : null}
      <AdminTitanClubView
        data={{ installed: true, enabled: true, siteCapPercent: 20, members: [], events: [] }}
        search={async () => []}
        onToggle={() => {}}
        onSave={() => new Promise((_, reject) => setTimeout(() => reject(new Error("Save failed (dummy)")), 300))}
        initialDraft={{ userId: "00000000-0000-0000-0000-000000000001", name: "Demo Member", email: "demo@example.com", type: "percent", amount: "15", maxCap: "35", note: "Dummy note kept after failed save", active: true, isNew: true }}
      />
    </main>
  );
}
