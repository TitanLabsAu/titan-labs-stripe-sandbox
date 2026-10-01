import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OrderList } from "@/components/OrderList";
import { fetchOrders } from "@/lib/orders";
import { ProfileMenu } from "@/components/ProfileMenu";

export const Route = createFileRoute("/_authenticated/order-history")({
  head: () => ({
    meta: [
      { title: "Order History | Titan Labs Aus" },
      {
        name: "description",
        content: "Review your completed and delivered Titan Labs Aus orders in full detail.",
      },
      { property: "og:title", content: "Order History | Titan Labs Aus" },
      {
        property: "og:description",
        content: "All your past Titan Labs Aus orders, items, prices and tracking details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderHistoryPage,
});

function OrderHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "history"],
    queryFn: () => fetchOrders(["delivered", "cancelled"]),
  });

  return (
    <div className="bg-hero min-h-screen">
      <SiteHeader />
      <main className="page-shell py-10 sm:py-12">
        <ProfileMenu />
        <section className="rounded-2xl border border-primary/25 bg-card/90 p-6 shadow-glow sm:p-8">
          <h2 className="technical-label text-foreground">Order history</h2>
          <p className="mt-2 text-sm text-muted-foreground">Every order that has been completed and delivered.</p>
        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your orders…</p>
          ) : (
            <OrderList orders={data ?? []} emptyMessage="No completed orders yet." />
          )}
        </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
